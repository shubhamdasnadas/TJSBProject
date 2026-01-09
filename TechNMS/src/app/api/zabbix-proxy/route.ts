import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import https from "https";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const ZABBIX_URL =
  process.env.NEXT_PUBLIC_ZABBIX_URL ||
  "https://192.168.0.252/monitor/api_jsonrpc.php";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const authHeader = req.headers.get("authorization");

    /* ===================== VALIDATION ===================== */

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Bearer token" },
        { status: 401 }
      );
    }

    // ✅ Extract token from Authorization header
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Invalid Bearer token" },
        { status: 401 }
      );
    }

    // ❌ NEVER forward frontend auth field
    delete body.auth;

    /* ===================== ZABBIX PAYLOAD ===================== */

    const zabbixPayload = {
      ...body,
      auth: token, // ✅ Inject token ONLY here
    };

    /* ===================== ZABBIX REQUEST ===================== */

    const resp = await axios.post(ZABBIX_URL, zabbixPayload, {
      headers: {
        "Content-Type": "application/json",
      },
      httpsAgent,
      timeout: 15000,
    });

    return NextResponse.json(resp.data);
  } catch (err: any) {
    console.error(
      "Zabbix Proxy Error:",
      err?.response?.data || err.message
    );

    return NextResponse.json(
      err?.response?.data || { error: "Zabbix proxy failed" },
      { status: err?.response?.status || 500 }
    );
  }
}
