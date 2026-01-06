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
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        withCredentials: true,
      }
    );

    const cookies = loginRes.headers["set-cookie"] || [];

    const cookieHeader = cookies
      .map((c: string) => c.split(";")[0])
      .join("; ");

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

    // ---------- 4) COLLECT deviceIds ----------
    const deviceIds: string[] = Array.from(
      new Set(
        tunnels
          .map((d: any) => d["vdevice-name"])
          .filter((x: any) => !!x)
      )
    );

    // ---------- 5) BFD SESSIONS ----------
    const bfdSessions: any[] = [];

    await Promise.all(
      deviceIds.map(async (deviceId) => {
        try {
          const res = await axios.get(
            `${base}/dataservice/device/bfd/sessions?deviceId=${deviceId}`,
            {
              headers: {
                Cookie: cookieHeader,
                "X-XSRF-TOKEN": token,
              },
              withCredentials: true,
            }
          );

          bfdSessions.push({
            deviceId,
            sessions: res.data?.data || [],
          });
        } catch (e) {
          console.error("BFD ERROR:", deviceId, e);
        }
      })
    );

    // ---------- ADD deviceId INTO TUNNELS ----------
    const tunnelsWithIds = tunnels.map((t: any) => ({
      ...t,
      deviceId: t["vdevice-name"],
    }));

    return NextResponse.json({
      success: true,

      // send EVERYTHING to frontend
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
