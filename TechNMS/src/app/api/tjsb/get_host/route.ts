import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { groupids, auth } = await req.json();

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;

    const payload = {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "host", "name"],
        groupids,
      },
      id: 1,
    };

    const res = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
    });

    return NextResponse.json({ result: res.data?.result ?? [] });
  } catch (e: any) {
    console.error("get_host error:", e?.message);
    return NextResponse.json(
      { error: "Could not fetch hosts" },
      { status: 500 }
    );
  }
}
