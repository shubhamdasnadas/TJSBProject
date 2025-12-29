import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST() {
  try {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL =
      "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";

    const payload = {
      jsonrpc: "2.0",
      method: "host.get",
      params: { output: "extend" },
      id: 1,
    };

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization:
          "Bearer 60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc",
      },
      httpsAgent,
      timeout: 10000,
    });

    return NextResponse.json(response.data);
  } catch (err: any) {
    console.error("host.get error:", err.message);
    return NextResponse.json(
      { error: "Server error connecting to Zabbix" },
      { status: 500 }
    );
  }
}
