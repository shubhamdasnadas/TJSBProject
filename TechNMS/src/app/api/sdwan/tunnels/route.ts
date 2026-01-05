import axios from "axios";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const base = process.env.VMANAGE_URL;
    const user = process.env.VMANAGE_USER;
    const pass = process.env.VMANAGE_PASS;

    // 1) login
    const res = await axios.post(
      `${base}/j_security_check`,
      `j_username=${user}&j_password=${pass}`
    
    );
    console.log("res", res)
    // 2) token
    const tokenRes = await axios.post(`${base}/dataservice/client/token`);

    const token = tokenRes.data;
    console.log("token", token)
    // 3) get tunnels
    const tunnels = await axios.post(
      `${base}/dataservice/device`,
      {
        headers: { "X-XSRF-TOKEN": token },

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
