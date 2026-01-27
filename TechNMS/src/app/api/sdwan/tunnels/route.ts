import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { ISP_BRANCHES } from "../../../(DashboardLayout)/availability/data/data";
import branches from "../../../(DashboardLayout)/availability/data/data";

/* ===================== CONFIG ===================== */

// const DATA_FILE = "/home/ec2-user/sdwan_tunnels.json";
// const DATA_FILE = "C:\\Users\\shaila\\OneDrive\\Desktop\\sdwan_tunnels.json";
const DATA_FILE = "C:\\Users\\admin\\Desktop\\sdwan_tunnels.json";

// Alert state persistence
const ALERT_STATE_FILE = path.join(process.cwd(), "alert_state.json");

/* ===================== HELPERS ===================== */

function getBranchName(hostname: string) {
  if (!hostname) return "NA";
  const found = branches.find((b: any) =>
    hostname.toLowerCase().includes(String(b.code || "").toLowerCase())
  );
  return found?.name || "NA";
}

/* 🔑 Replace Private1 → TCL etc inside strings */
function replaceISPNames(text: string) {
  if (!text) return text;

  let result = text;
  ISP_BRANCHES.forEach((isp: any) => {
    const regex = new RegExp(isp.type, "gi");
    result = result.replace(regex, isp.name);
  });

  return result;
}

/* ===================== EMAIL ===================== */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((err) => {
  if (err) console.error("❌ SMTP FAILED:", err);
  else console.log("✅ SMTP READY");
});

async function sendMail(subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: `"SD-WAN Monitor" <${process.env.SMTP_USER}>`,
      to: process.env.ALERT_MAIL_TO,
      subject,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error("❌ MAIL SEND FAILED:", err?.message || err);

    return {
      success: false,
      error: err?.message || "Mail failed",
    };
  }
}

/* ===================== ALERT STATE ===================== */

function loadAlertState(): Record<string, string> {
  try {
    if (!fs.existsSync(ALERT_STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(ALERT_STATE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function saveAlertState(state: Record<string, string>) {
  fs.writeFileSync(ALERT_STATE_FILE, JSON.stringify(state, null, 2));
}

/* ===================== ADDED: MAIL CONTROL HELPERS ===================== */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDailyLimitError(msg: string) {
  if (!msg) return false;
  return (
    msg.includes("Daily user sending limit exceeded") ||
    msg.includes("550-5.4.5") ||
    msg.includes("sending limits") ||
    msg.includes("https://support.google.com/a/answer/166852")
  );
}

/* ===================== API ===================== */

export async function GET() {
  try {
    let downCount = 0;
    let partialCount = 0;

    let mailAttempted = 0;
    let mailSent = 0;
    let mailFailed = 0;

    const mailResults: any[] = [];

    // ✅ ADDED: mail throttling & breaker
    let stopMailSending = false;
    let stopReason = "";
    const MAIL_DELAY_MS = Number(process.env.MAIL_DELAY_MS || 800);

    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const json = JSON.parse(raw);

    const devices = json?.sites || {};
    const alertState = loadAlertState();

    // ✅ based on your json response image:
    // sites: { "192.168.x.x": { hostname, tunnels: [...] } }
    for (const [systemIp, siteObj] of Object.entries<any>(devices)) {
      if (!siteObj) continue;

      const hostname = siteObj.hostname || "NA";
      const branchName = getBranchName(hostname);

      const tunnels = Array.isArray(siteObj.tunnels) ? siteObj.tunnels : [];

      const siteState = String(siteObj.siteState || "").toLowerCase();

      /* ===========================================================
         ✅ UPDATED SCENARIO: TUNNEL LENGTH IS ZERO + SITE STATE DOWN
      =========================================================== */
      if (tunnels.length === 0 && (siteState === "down" || siteState === "DOWN")) {
        const lastState = alertState[systemIp];

        // ✅ send only if state changes (avoid spam)
        if (!lastState || lastState !== "isolated") {
          mailAttempted++;

          let mailResp: any = { success: false, error: "Skipped" };

          if (!stopMailSending) {
            mailResp = await sendMail(
              `🛰️ BRANCH ISOLATED — ${hostname}`,
              `
                <div style="font-family:Arial,sans-serif;">
                  <h2 style="color:#d9534f;">🛰️ Branch Isolated Alert</h2>
                  <p style="font-size:14px;">
                    ❌ <b>No tunnels found</b> for this branch.<br/>
                    This branch might be <b>isolated / disconnected / unreachable</b>.
                  </p>

                  <div style="padding:10px;border:1px solid #ddd;border-radius:8px;margin-top:12px;">
                    <p>🏢 <b>Branch:</b> ${branchName}</p>
                    <p>🖥️ <b>Hostname:</b> ${hostname}</p>
                    <p>🌐 <b>System IP:</b> ${systemIp}</p>
                  </div>

                  <p style="margin-top:16px;color:#555;">
                    ⚡ Please check device connectivity, controller reachability and WAN links.
                  </p>
                </div>
              `
            );

            await sleep(MAIL_DELAY_MS);

            if (
              !mailResp.success &&
              isDailyLimitError(String(mailResp.error || ""))
            ) {
              stopMailSending = true;
              stopReason =
                "Gmail daily sending limit exceeded. Remaining mails skipped.";
            }
          } else {
            mailResp = {
              success: false,
              error:
                stopReason ||
                "Skipped sending mail (daily limit exceeded earlier)",
            };
          }

          if (mailResp.success) mailSent++;
          else mailFailed++;

          mailResults.push({
            systemIp,
            hostname,
            branchName,
            state: "isolated",
            mail: mailResp,
          });

          // ✅ Update last state
          alertState[systemIp] = "isolated";
        }

        continue; // ✅ important (do not process further)
      }

      const states = tunnels.map((t: any) =>
        String(t.state || "").toLowerCase()
      );

      const hasDown = states.includes("down");
      const hasPartial = states.includes("partial");
      const allUp = states.every((s: string) => s === "up");

      let currentState: "up" | "down" | "partial" = "partial";
      if (allUp) currentState = "up";
      else if (hasDown) currentState = "down";
      else if (hasPartial) currentState = "partial";

      const lastState = alertState[systemIp];

      // ✅ send only when state changes
      if (!lastState || currentState !== lastState) {
        /* ================= DOWN / PARTIAL ================= */
        if (currentState === "down" || currentState === "partial") {
          currentState === "down" ? downCount++ : partialCount++;

          const issueRows = tunnels
            .filter((t: any) => {
              const st = String(t.state || "").toLowerCase();
              return st === "down" || st === "partial";
            })
            .map((t: any) => {
              const st = String(t.state || "").toLowerCase();
              const color = st === "down" ? "red" : "orange";

              return `
                <tr>
                  <td>${branchName}</td>
                  <td>${hostname}</td>
                  <td>${systemIp}</td>
                  <td>${replaceISPNames(t.tunnelName || "-")}</td>
                  <td style="color:${color};font-weight:bold">${st.toUpperCase()}</td>
                  <td>${t.uptime || "-"}</td>
                </tr>`;
            })
            .join("");

          mailAttempted++;

          let mailResp: any = { success: false, error: "Skipped" };

          // ✅ ADDED: breaker if daily Gmail limit is exceeded
          if (!stopMailSending) {
            mailResp = await sendMail(
              currentState === "down"
                ? `🚨  TUNNEL DOWN — ${hostname}`
                : `⚠️  PARTIAL TUNNEL ISSUE — ${hostname}`,
              `
                <h3>${currentState === "down" ? "🚨 DOWN" : "⚠️ PARTIAL"} ALERT</h3>
                <table border="1" cellpadding="6" cellspacing="0">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Hostname</th>
                      <th>System IP</th>
                      <th>Tunnel</th>
                      <th>State</th>
                      <th>Uptime</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${issueRows}
                  </tbody>
                </table>
              `
            );

            // ✅ ADDED: delay after each mail
            await sleep(MAIL_DELAY_MS);

            // ✅ ADDED: stop all future mails if Gmail limit exceeded
            if (
              !mailResp.success &&
              isDailyLimitError(String(mailResp.error || ""))
            ) {
              stopMailSending = true;
              stopReason =
                "Gmail daily sending limit exceeded. Remaining mails skipped.";
            }
          } else {
            mailResp = {
              success: false,
              error:
                stopReason ||
                "Skipped sending mail (daily limit exceeded earlier)",
            };
          }

          if (mailResp.success) mailSent++;
          else mailFailed++;

          mailResults.push({
            systemIp,
            hostname,
            branchName,
            state: currentState,
            mail: mailResp,
          });
        }

        // ✅ Update last state after processing
        alertState[systemIp] = currentState;
      }
    }

    saveAlertState(alertState);

    return NextResponse.json({
      ...json,

      // ✅ you wanted generatedAt in API response
      generatedAt: new Date().toISOString(),

      alertSummary: {
        downTriggered: downCount,
        partialTriggered: partialCount,
        totalTriggered: downCount + partialCount,
      },

      mailSummary: {
        totalAttempted: mailAttempted,
        sent: mailSent,
        failed: mailFailed,
        results: mailResults,

        // ✅ ADDED extra info
        mailSendingStopped: stopMailSending,
        stopReason: stopReason || null,
        delayMs: MAIL_DELAY_MS,
      },
    });
  } catch (err: any) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { error: "Failed", details: err.message },
      { status: 500 }
    );
  }
}
