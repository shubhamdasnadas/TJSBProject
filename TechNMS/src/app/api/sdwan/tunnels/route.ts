import axios from "axios";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const base = process.env.VMANAGE_URL;
    const user = process.env.VMANAGE_USER;
    const pass = process.env.VMANAGE_PASS;

    // 1) login
    const res = await axios.post(
      `${base}/j_security_check`,
      `j_username=${user}&j_password=${pass}`,
      { withCredentials: true }
    );
    console.log("res", res)
    // 2) token
    const tokenRes = await axios.get(`${base}/dataservice/client/token`, {
      withCredentials: true,
    });

    const token = tokenRes.data;
    console.log("token", token)
    // 3) get tunnels
    const tunnels = await axios.get(
      `${base}/dataservice/device/tunnel/summary`,
      {
        headers: { "X-XSRF-TOKEN": token },
        withCredentials: true,
      }
    );
    console.log("Tunnel", tunnels);
    return NextResponse.json(tunnels.data);
  } catch (err: any) {
    console.error(err?.response?.data || err);
    return NextResponse.json(
      { error: "Failed to fetch tunnel status" },
      { status: 500 }
    );
  }
}
