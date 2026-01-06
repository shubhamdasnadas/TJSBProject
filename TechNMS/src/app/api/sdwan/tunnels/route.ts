import axios from "axios";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const base = process.env.VMANAGE_URL;
    const user = process.env.VMANAGE_USER;
    const pass = process.env.VMANAGE_PASS;

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

    const jsession = cookies
      .find((c) => c.startsWith("JSESSIONID"))
      ?.split(";")[0];

    if (!jsession) throw new Error("JSESSIONID cookie not found");

    // ---------- 2) TOKEN ----------
    const tokenRes = await axios.post(
      `${base}/dataservice/client/token`,
      {},
      {
        headers: { Cookie: jsession },
        withCredentials: true,
      }
    );

    const token = tokenRes.data;

    // ---------- 3) DEVICE API ----------
    const tunnelsRes = await axios.post(
      `${base}/dataservice/device`,
      {},
      {
        headers: {
          Cookie: jsession,
          "X-XSRF-TOKEN": token,
        },
        withCredentials: true,
      }
    );

    // 👇 RETURN BOTH DATA + DEBUG OBJECT
    return NextResponse.json({
      data: tunnelsRes.data,
      debug: {
        jsession,
        token,
        loginStatus: loginRes.status,
        deviceCount: tunnelsRes.data?.data?.length,
      },
    });
  } catch (err: any) {
    console.error(err?.response?.data || err);

    return NextResponse.json(
      { error: "Failed to fetch tunnel status" },
      { status: 500 }
    );
  }
}
