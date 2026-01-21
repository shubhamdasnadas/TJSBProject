import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { ISP_BRANCHES } from "../../../(DashboardLayout)/availability/data/data";
import branches from "../../../(DashboardLayout)/availability/data/data";

/* ===================== CONFIG ===================== */

// const DATA_FILE = "/home/ec2-user/sdwan_tunnels.json";
const DATA_FILE = "C:\\Users\\admin\\Desktop\\sdwan_sites.json";

// Alert state persistence
const ALERT_STATE_FILE = path.join(process.cwd(), "alert_state.json");

/* ===================== HELPERS ===================== */

function getBranchName(hostname: string) {
  if (!hostname) return "NA";
  const found = branches.find((b: any) =>
    hostname.toLowerCase().includes(b.code?.toLowerCase())
  );
  return found?.name || "NA";
}

/* 🔑 Replace Private1 → TCL etc inside strings */
function replaceISPNames(text: string) {
  if (!text) return text;

  let result = text;
  ISP_BRANCHES.forEach((isp) => {
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
  await transporter.sendMail({
    from: `"SD-WAN Monitor" <${process.env.SMTP_USER}>`,
    to: process.env.ALERT_MAIL_TO,
    subject,
    html,
  });
}

/* ===================== ALERT STATE ===================== */

function loadAlertState(): Record<string, string> {
  if (!fs.existsSync(ALERT_STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(ALERT_STATE_FILE, "utf-8"));
}

function saveAlertState(state: Record<string, string>) {
  fs.writeFileSync(ALERT_STATE_FILE, JSON.stringify(state, null, 2));
}

/* ===================== API ===================== */

export async function GET() {
  try {
    let downCount = 0;
    let partialCount = 0;

    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const json = JSON.parse(raw);

    const devices = json.sites || {};
    const alertState = loadAlertState();

    for (const [systemIp, tunnels] of Object.entries<any[]>(devices)) {
      if (!Array.isArray(tunnels) || tunnels.length === 0) continue;

      const hostname = tunnels[0]?.hostname || "NA";
      const branchName = getBranchName(hostname);

      const states = tunnels.map((t) =>
        String(t.state || "").toLowerCase()
      );

      const hasDown = states.includes("down");
      const allUp = states.every((s) => s === "up");

      let currentState: "up" | "down" | "partial" = "partial";
      if (allUp) currentState = "up";
      else if (hasDown) currentState = "down";

      const lastState = alertState[systemIp];

      if (!lastState || currentState !== lastState) {
        /* ================= DOWN / PARTIAL ================= */
        if (currentState === "down" || currentState === "partial") {
          currentState === "down" ? downCount++ : partialCount++;

          const downRows = tunnels
            .filter((t) => String(t.state).toLowerCase() === "down")
            .map((t) => {
              return `
                <tr>
                  <td>${branchName}</td>
                  <td>${hostname}</td>
                  <td>${systemIp}</td>
                  <td>${replaceISPNames(t.tunnelName)}</td>
                  <td style="color:red;font-weight:bold">DOWN</td>
                  <td>${t.uptime}</td>
                </tr>`;
            })
            .join("");

          await sendMail(
            currentState === "down"
              ? `🚨 TUNNEL DOWN — ${hostname}`
              : `⚠️ PARTIAL TUNNEL ISSUE — ${hostname}`,
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
                  ${downRows}
                </tbody>
              </table>
            `
          );
        }

        /* ================= RECOVERY ================= */
        else if (currentState === "up" && lastState) {
          await sendMail(
            `✅ RECOVERED — ${hostname}`,
            `
              <h3 style="color:green">✅ ALL TUNNELS UP</h3>
              <p><b>Branch:</b> ${branchName}</p>
              <p><b>Hostname:</b> ${hostname}</p>
              <p><b>System IP:</b> ${systemIp}</p>
            `
          );
        }

        alertState[systemIp] = currentState;
      }
    }

    saveAlertState(alertState);

    return NextResponse.json({
      ...json,
      generatedAt: new Date().toISOString(),
      alertSummary: {
        downSent: downCount,
        partialSent: partialCount,
        totalSent: downCount + partialCount,
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
