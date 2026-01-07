import axios from "axios";
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

    // ---------- 4) Extract REAL device identifiers ----------
    const devices = tunnels.map((d: any) => ({
      systemIp: d["system-ip"],
      uuid: d["uuid"] || d["deviceId"],
      hostname: d["host-name"],
      raw: d,
    }));

    const deviceIds = devices
      .map((d:any) => d.uuid)
      .filter(Boolean);

    // ---------- 5) BFD SESSIONS ----------
    const bfdSessions = await Promise.all(
      deviceIds.map(async (uuid:any) => {
        try {
          const res = await axios.get(
            `${base}/dataservice/device/bfd/sessions?deviceId=${uuid}`,
            {
              headers: {
                Cookie: cookieHeader,
                "X-XSRF-TOKEN": token,
              },
              withCredentials: true,
            }
          );

          return {
            deviceId: uuid,
            sessions: res.data?.data || [],
          };
        } catch (err: any) {
          console.error("FAILED BFD:", uuid, err?.response?.status);
          return { deviceId: uuid, sessions: [] };
        }
      })
    );

    // ---------- 6) Attach correct deviceId to tunnels ----------
    const tunnelsWithIds = tunnels.map((t: any) => ({
      ...t,
      deviceId: t["uuid"] || t["deviceId"] || t["system-ip"],
    }));

    return NextResponse.json({
      success: true,
      api: {
        login: { status: loginRes.status },
        token,
        devices: tunnelsWithIds,
        deviceIds,
        bfdSessions,
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
