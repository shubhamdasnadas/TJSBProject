import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const ZABBIX_URL =
  process.env.NEXT_PUBLIC_ZABBIX_URL ||
  "https://192.168.0.252/monitor/api_jsonrpc.php";

const user_token = localStorage.getItem("zabbix_auth") || "";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Bearer token" },
        { status: 401 }
      );
    }

    // 🔥 Extract token from Bearer
    const token = authHeader.replace("Bearer ", "");

    // 🔥 NEVER forward auth from frontend
    delete body.auth;

    // 🔥 Inject auth ONLY at proxy level
    const zabbixPayload = {
      ...body,

    };

    const resp = await axios.post(ZABBIX_URL, zabbixPayload, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user_token}`, },
      httpsAgent,
      timeout: 15000,
    });

    return NextResponse.json(resp.data);
  } catch (err: any) {
    console.error("Zabbix Proxy Error:", err?.response?.data || err.message);

    return NextResponse.json(
      err?.response?.data || { error: "Zabbix proxy failed" },
      { status: err?.response?.status || 500 }
    );
  }
}
