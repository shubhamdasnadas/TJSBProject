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

    // read cookies returned by vManage
    const cookies = loginRes.headers["set-cookie"] || [];

    const jsession = cookies
      .find((c) => c.startsWith("JSESSIONID"))
      ?.split(";")[0];
    console.log("data session", jsession);
    if (!jsession) {
      throw new Error("JSESSIONID cookie not found");
    }

    // ---------- 2) GET TOKEN ----------
    const tokenRes = await axios.post(
      `${base}/dataservice/client/token`,
      {
        headers: {
          Cookie: jsession,
        },
        withCredentials: true,
      }
    );

    const token = tokenRes.data;
    console.log("token", token);
    // ---------- 3) CALL API ----------
    const tunnelsRes = await axios.post(
      `${base}/dataservice/device`,
      {
        headers: {
          Cookie: jsession,
          "X-XSRF-TOKEN": token,
        },
        withCredentials: true,
      }
    );
    console.log("tunnelsRes", tunnelsRes)
    return NextResponse.json(tunnelsRes.data);
  } catch (err: any) {
    console.error(err?.response?.data || err);
    return NextResponse.json(
      { error: "Failed to fetch tunnel status" },
      { status: 500 }
    );
  }
}
