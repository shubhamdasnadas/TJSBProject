import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import https from "https";

const rejectUnauthorized =
  process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0";

const httpsAgent = new https.Agent({
  rejectUnauthorized,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const zabbixUrl =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    const authHeader = req.headers.get("authorization");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const resp = await axios.post(zabbixUrl, body, {
      headers,
      httpsAgent,
      timeout: 15000,
    });

    return NextResponse.json(resp.data, { status: resp.status });
  } catch (err: any) {
    console.error("Zabbix Proxy Error:", err?.response?.data || err.message);

    if (err?.response) {
      return NextResponse.json(err.response.data, {
        status: err.response.status,
      });
    }

    if (err?.request) {
      return NextResponse.json(
        { error: "No response from Zabbix server" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Zabbix proxy failed" },
      { status: 500 }
    );
  }
}
