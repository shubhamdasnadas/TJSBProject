import axios from "axios";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const user = process.env.VMANAGE_USER;
    const pass = process.env.VMANAGE_PASS;

    const base = process.env.VMANAGE_URL;

    // ---------- 1) LOGIN (matches curl exactly) ----------
    const loginRes = await axios.post(
      `curl -k \
          ${base}/j_security_check`,
      `j_username=${user}&j_password=${pass}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        // withCredentials: true,
      }
    );

    const cookies = loginRes.headers["set-cookie"] || [];

    const jsession = cookies
      .find((c) => c.startsWith("JSESSIONID"))
      ?.split(";")[0];

    if (!jsession) {
      throw new Error("JSESSIONID cookie not found");
    }
    console.log("data res", jsession)
    // ---------- 2) TOKEN (uses cookie like curl -b cookies.txt) ----------
    const tokenRes = await axios.post(
      `curl -k \
      ${base}/dataservice/client/token \
      -b cookies.txt`,
    );

    const token = tokenRes.data;
    console.log("token", token)
    // ---------- 3) DEVICE API (matches curl exactly) ----------
    const tunnelsRes = await axios.post(
      `curl -k \ 
      ${base}/dataservice/device \
      -b cookies.txt \
      -H "X-XSRF-TOKEN: ${token}"`,
    );
    console.log("tunnelsRes", tunnelsRes)
    // ---------- RESPONSE TO FRONTEND ----------
    return NextResponse.json({
      success: true,
      message: "SD-WAN device list fetched successfully",
      data: tunnelsRes.data,
      debug: {
        loginUrl: `${base}/j_security_check`,
        tokenUrl: `${base}/dataservice/client/token`,
        devicesUrl: `${base}/dataservice/device`,
        jsession,
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
