import axios from "axios";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const user = process.env.VMANAGE_USER;
    const pass = process.env.VMANAGE_PASS;

    const base = "https://vmanage-31949190.sdwan.cisco.com";

    // ---------- 1) LOGIN ----------
    const loginRes = await axios.post(
      `${base}/j_security_check`,
      `j_username=${user}&j_password=${pass}`,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        withCredentials: true,
      }
    );

    const cookies = loginRes.headers["set-cookie"] || [];
    const cookieHeader = cookies.map((c: string) => c.split(";")[0]).join("; ");

    if (!cookieHeader) throw new Error("No cookies returned from vManage");

    // ---------- 2) TOKEN ----------
    const tokenRes = await axios.get(`${base}/dataservice/client/token`, {
      headers: { Cookie: cookieHeader },
      withCredentials: true,
    });

    const token = tokenRes.data;

    // ---------- 3) DEVICE LIST ----------
    const tunnelsRes = await axios.get(`${base}/dataservice/device`, {
      headers: {
        Cookie: cookieHeader,
        "X-XSRF-TOKEN": token,
      },
      withCredentials: true,
    });

    const tunnels = tunnelsRes.data?.data || [];

    // ---------- 4) COLLECT VALID deviceIds ----------
    const deviceIds: string[] = Array.from(
      new Set(
        tunnels
          .map((d: any) => d["deviceId"])
          .filter((id: any) => typeof id === "string" && id.trim().length > 0)
      )
    );

    // ---------- 5) BFD SESSIONS (BY deviceId) ----------
    const bfdSessions = await Promise.all(
      deviceIds.map(async (deviceId) => {
        try {
          const res = await axios.get(
            `${base}/dataservice/device/bfd/sessions?deviceId=${encodeURIComponent(
              deviceId
            )}`,
            {
              headers: {
                Cookie: cookieHeader,
                "X-XSRF-TOKEN": token,
              },
              withCredentials: false,
            }
          );

          return {
            deviceId,
            sessions: res.data?.data || [],
          };
        } catch (err: any) {
          console.error("BFD ERROR:", deviceId, err?.response?.status);
          return { deviceId, sessions: [] };
        }
      })
    );

    // ---------- 6) EMAIL IF ANY SESSION IS DOWN ----------
    const downSessions: any[] = [];

    bfdSessions.forEach((item: any) => {
      (item.sessions || []).forEach((s: any) => {
        if (s.state === "down") {
          downSessions.push({
            deviceId: item.deviceId,
            hostname: s["vdevice-host-name"] || "NA",
            color: s["color"] || "NA",
            localColor: s["local-color"] || "NA",
            state: s.state,
          });
        }
      });
    });

    if (downSessions.length > 0) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const emailBody = downSessions
        .map(
          (d) => `
Hostname: ${d.hostname}
IP / DeviceId: ${d.deviceId}
Color: ${d.color}
Local Color: ${d.localColor}
State: ${d.state}
------------------------------
`
        )
        .join("\n");

      await transporter.sendMail({
        from: `"SD-WAN Monitor" <${process.env.SMTP_USER}>`,
        to: process.env.ALERT_MAIL_TO,
        subject: "⚠️ SD-WAN BFD Session DOWN Alert",
        text: `The following BFD tunnels are DOWN:\n\n${emailBody}`,
      });

      console.log("Email alert sent.");
    }

    // ---------- 7) ADD deviceId BACK ----------
    const tunnelsWithIds = tunnels.map((t: any) => ({
      ...t,
      deviceId: t["deviceId"],
    }));

    return NextResponse.json({
      success: true,
      api: {
        login: { status: loginRes.status },
        token,
        devices: tunnelsWithIds,
        deviceIds,
        bfdSessions,
        alertsSent: downSessions.length,
      },
    });
  } catch (err: any) {
    console.error("SDWAN ERROR:", err?.response?.data || err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch SD-WAN data",
        detail: err?.response?.data || err?.message,
      },
      { status: 500 }
    );
  }
}
