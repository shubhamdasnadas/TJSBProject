import axios from "axios";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const BASE = "https://vmanage-31949190.sdwan.cisco.com";
const CONCURRENCY = 6;

/* =====================================================
   SERVER-SIDE CACHE (GLOBAL, SHARED)
   ===================================================== */
let SERVER_CACHE: any = null;
let LAST_FETCH = 0;
const CACHE_TTL = 60 * 1000; // 1 minute
let IN_PROGRESS: Promise<any> | null = null;

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

/* =====================================================
   CORE FETCH FUNCTION (UNCHANGED LOGIC)
   ===================================================== */
async function fetchFromCiscoAndProcess() {
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

  const results: any[] = [];
  let index = 0;

  /* ---------------- WORKERS ---------------- */
  const MAX_RETRY = 2;

  const worker = async () => {
    while (true) {
      const systemIp = systemIps[index++];
      if (!systemIp) break;

      let sessions: any[] = [];

      for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        try {
          const res = await vmanage.get(
            `/dataservice/device/bfd/sessions?deviceId=${systemIp}`
          );

          sessions = res.data?.data || [];
          if (sessions.length > 0) break;

          await new Promise((r) => setTimeout(r, 300));
        } catch {
          sessions = [];
        }
      }

      results.push({
        systemIp,
        hostname: deviceMap.get(systemIp),
        sessions,
      });
    }
  };

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker())
  );

  /* ---------------- DEVICE-WISE ---------------- */
  const deviceWiseTunnels: Record<string, any[]> = {};

  for (const d of results) {
    deviceWiseTunnels[d.systemIp] = (d.sessions || []).map((s: any) => ({
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
    }));
  }

  /* =====================================================
     🔔 ALERT LOGIC – EXECUTED ONCE PER FETCH
     ===================================================== */
  for (const [systemIp, tunnels] of Object.entries(deviceWiseTunnels)) {
    if (!tunnels || tunnels.length === 0) continue;

    const hostname = tunnels[0].hostname || "NA";
    const states = tunnels.map((t: any) => t.state);

    const allUp = states.every((s: string) => s === "up");
    const allDown = states.every((s: string) => s === "down");

    if (!allUp && !allDown) {
      const html = `
        <h3>⚠️ Partial Tunnel Failure</h3>
        <p><b>System IP:</b> ${systemIp}</p>
        <p><b>Hostname:</b> ${hostname}</p>
        <ul>
          ${tunnels
          .map(
            (t: any) =>
              `<li>${t.tunnelName} — ${t.uptime} — <b>${t.state}</b></li>`
          )
          .join("")}
        </ul>
      `;
      await sendAlertMail(`PARTIAL DOWN — ${hostname}`, html);
      continue;
    }

    if (allDown) {
      const html = `
        <h3>🚨 ALL TUNNELS DOWN</h3>
        <p><b>Hostname:</b> ${hostname}</p>
        <p><b>System IP:</b> ${systemIp}</p>
      `;
      await sendAlertMail(`ALL DOWN — ${hostname}`, html);
    }
  }

  return {
    success: true,
    totalEdges: systemIps.length,
    devices: deviceWiseTunnels,
  };
}

/* =====================================================
   API HANDLER (CACHE + LOCK)
   ===================================================== */
export async function POST() {
  const now = Date.now();

  // ✅ Serve cached response
  if (SERVER_CACHE && now - LAST_FETCH < CACHE_TTL) {
    return NextResponse.json(SERVER_CACHE);
  }

  // ✅ Prevent parallel Cisco hits
  if (!IN_PROGRESS) {
    IN_PROGRESS = fetchFromCiscoAndProcess()
      .then((data) => {
        SERVER_CACHE = data;
        LAST_FETCH = Date.now();
        IN_PROGRESS = null;
        return data;
      })
      .catch((err) => {
        IN_PROGRESS = null;
        throw err;
      });
  }

  const data = await IN_PROGRESS;
  return NextResponse.json(data);
}
