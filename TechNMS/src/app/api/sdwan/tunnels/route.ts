import axios from "axios";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const BASE = "https://vmanage-31949190.sdwan.cisco.com";
const CONCURRENCY = 10;

/* ---------------- EMAIL TRANSPORT ---------------- */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendAlertMail(subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: `"SD-WAN Monitor" <${process.env.SMTP_USER}>`,
      to: process.env.ALERT_MAIL_TO,
      subject,
      html,
    });
  } catch (e) {
    console.error("MAIL ERROR:", e);
  }
}

export async function POST() {
  try {
    const user = process.env.VMANAGE_USER!;
    const pass = process.env.VMANAGE_PASS!;

    /* ---------------- LOGIN ---------------- */
    const loginRes = await axios.post(
      `${BASE}/j_security_check`,
      `j_username=${user}&j_password=${pass}`,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const cookieHeader = (loginRes.headers["set-cookie"] || [])
      .map((c: string) => c.split(";")[0])
      .join("; ");

    if (!cookieHeader) throw new Error("Login failed – no session cookie");

    /* ---------------- TOKEN ---------------- */
    const tokenRes = await axios.get(`${BASE}/dataservice/client/token`, {
      headers: { Cookie: cookieHeader },
    });

    const token = tokenRes.data || "";

    /* ---------------- SESSION ---------------- */
    const vmanage = axios.create({
      baseURL: BASE,
      headers: {
        Cookie: cookieHeader,
        "X-XSRF-TOKEN": token,
      },
      timeout: 15000,
    });

    /* ---------------- INVENTORY ---------------- */
    const deviceRes = await vmanage.get("/dataservice/device");
    const devices = deviceRes.data?.data || [];

    const wanEdges = devices.filter(
      (d: any) =>
        ["vedge", "cedge"].includes(d["device-type"]) &&
        d["reachability"] === "reachable" &&
        d["system-ip"]
    );

    const deviceMap = new Map<string, string>(
      wanEdges.map((d: any) => [d["system-ip"], d["host-name"]])
    );

    const systemIps = Array.from(deviceMap.keys());

    /* ---------------- WORKERS ---------------- */
    const results: any[] = [];
    let index = 0;

    const worker = async () => {
      while (true) {
        const systemIp = systemIps[index++];
        if (!systemIp) break;

        try {
          const res = await vmanage.get(
            `/dataservice/device/bfd/sessions?deviceId=${systemIp}`
          );

          results.push({
            systemIp,
            hostname: deviceMap.get(systemIp),
            sessions: res.data?.data || [],
            apiSuccess: true, // ✅ API CALL SUCCESS
          });
        } catch {
          results.push({
            systemIp,
            hostname: deviceMap.get(systemIp),
            sessions: [],
            apiSuccess: false, // ❌ API CALL FAILED
          });
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    /* ---------------- DEVICE-WISE ---------------- */
    const deviceWiseTunnels: Record<
      string,
      {
        hostname: string;
        apiSuccess: boolean; // ✅ BOOLEAN REQUESTED
        tunnels: any[];
      }
    > = {};

    for (const d of results) {
      deviceWiseTunnels[d.systemIp] = {
        hostname: d.hostname,
        apiSuccess: d.apiSuccess,
        tunnels: (d.sessions || []).map((s: any) => ({
          tunnelName: `${d.systemIp}:${s["local-color"]} → ${s["system-ip"]}:${s["color"]}`,
          localSystemIp: d.systemIp,
          remoteSystemIp: s["system-ip"],
          localColor: s["local-color"],
          remoteColor: s["color"],
          state: s.state,
          uptime: s.uptime,
          uptimeEpoch: s["uptime-date"],
          lastUpdated: s.lastupdated,
          transitions: s.transitions,
          protocol: s.proto,
          hostname: d.hostname,
        })),
      };
    }

    /* =====================================================
       🔔 ALERT LOGIC – UNCHANGED
       ===================================================== */
    for (const [systemIp, device] of Object.entries(deviceWiseTunnels)) {
      const tunnels = device.tunnels;
      if (!tunnels || tunnels.length === 0) continue;

      const hostname = device.hostname || "NA";
      const states = tunnels.map((t: any) => t.state);

      const allUp = states.every((s: string) => s === "up");
      const allDown = states.every((s: string) => s === "down");

      if (!allUp && !allDown) {
        await sendAlertMail(
          `PARTIAL DOWN — ${hostname} (${systemIp})`,
          `<p>Partial tunnel failure detected</p>`
        );
      }

      if (allDown) {
        await sendAlertMail(
          `ALL DOWN — ${hostname} (${systemIp})`,
          `<p>All tunnels are down</p>`
        );
      }
    }

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      success: true,
      totalEdges: systemIps.length,
      devices: deviceWiseTunnels, // ✅ frontend gets apiSuccess boolean
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || err },
      { status: 500 }
    );
  }
}
