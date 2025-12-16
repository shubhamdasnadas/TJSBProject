import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/*
  Expected POST body:
  {
    "auth": "ZABBIX_AUTH_TOKEN"
  }
*/

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { auth } = body;

    if (!auth) {
      return NextResponse.json(
        { error: "Missing Zabbix auth token" },
        { status: 400 }
      );
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // allow self-signed cert
    });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    /* ================= ZABBIX PAYLOAD ================= */
    const payload = {
      jsonrpc: "2.0",
      method: "user.get",
      params: {
        output: "extend",
      },
      auth, 
      id: 1,
    };

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Host: "192.168.0.252",
        Referer: "https://192.168.0.252",
        Origin: "https://192.168.0.252",
      },
      httpsAgent,
      timeout: 10000,
    });

    /* ================= SUCCESS ================= */
    if (response.data?.result) {
      return NextResponse.json({
        result: response.data.result,
      });
    }

    /* ================= ZABBIX ERROR ================= */
    return NextResponse.json(
      {
        error: response.data?.error || "Zabbix rejected the request",
      },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("user.get API error:", error.message);

    return NextResponse.json(
      {
        error: "Server error: Unable to reach Zabbix API",
      },
      { status: 500 }
    );
  }
}
