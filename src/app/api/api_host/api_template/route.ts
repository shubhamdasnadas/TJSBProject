import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { groupids, auth } = await req.json();

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";
    const payload = {
      jsonrpc: "2.0",
      method: "template.get",
      params: {
        output: "extend",
        selectGroups: "extend",
        groupids: groupids
      },

      id: 1,
    };
    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
        "Host": "192.168.0.252",
        "Referer": "https://192.168.0.252",
        "Origin": "https://192.168.0.252",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
      timeout: 10000,
    });

    if (response.data?.result) {
      return NextResponse.json({ result: response.data.result });
    }

    return NextResponse.json(
      { error: response.data?.error || "Zabbix rejected the request" },
      { status: 403 }
    );

  } catch (error: any) {
    console.error("templategroup.get error:", error.message);

    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
