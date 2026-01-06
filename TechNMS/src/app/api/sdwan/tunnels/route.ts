import axios from "axios";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const user = process.env.VMANAGE_USER;
    const pass = process.env.VMANAGE_PASS;

    const base = "https://vmanage-31949190.sdwan.cisco.com";

    //
    // ---------- 1) LOGIN ----------
    //
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

    // collect ALL cookies returned from server
    const cookies = loginRes.headers["set-cookie"] || [];

    const cookieHeader = cookies
      .map((c: string) => c.split(";")[0])
      .join("; ");

    if (!cookieHeader) throw new Error("No cookies returned from vManage");

    console.log("COOKIES:", cookieHeader);

    //
    // ---------- 2) GET TOKEN (MUST BE GET!) ----------
    //
    const tokenRes = await axios.get(`${base}/dataservice/client/token`, {
      headers: {
        Cookie: cookieHeader,
      },
      withCredentials: true,
    });

    const token = tokenRes.data;
    console.log("TOKEN:", token);

    //
    // ---------- 3) DEVICE LIST (MUST BE GET!) ----------
    //
    const tunnelsRes = await axios.get(`${base}/dataservice/device`, {
      headers: {
        Cookie: cookieHeader,
        "X-XSRF-TOKEN": token,
      },
      withCredentials: true,
    });

    console.log("DEVICES:", tunnelsRes.data);

    return NextResponse.json({
      success: true,
      data: tunnelsRes.data,
      debug: {
        loginUrl: `${base}/j_security_check`,
        tokenUrl: `${base}/dataservice/client/token`,
        devicesUrl: `${base}/dataservice/device`,
        cookieHeader,
        token,
        loginStatus: loginRes.status,
        deviceCount: tunnelsRes.data?.data?.length,
      },
    });
  } catch (err: any) {
    console.error("SDWAN ERROR:", err?.response?.data || err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch SD-WAN devices",
        detail: err?.response?.data || err?.message,
      },
      { status: 500 }
    );
  }
}
