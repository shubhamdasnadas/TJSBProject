import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

// 🔥 CPU ITEMID YOU WANT
const CPU_ITEMID = "100626";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Bearer token" },
        { status: 401 }
      );
    }

    const body = {
      jsonrpc: "2.0",
      method: "history.get",
      params: {
        output: "extend",
        history: 0,               // numeric
        itemids: [CPU_ITEMID],
        sortfield: "clock",
        sortorder: "DESC",
        limit: 100,
      },
      id: 10,
    };

    const zabbixRes = await fetch(ZABBIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const zabbixJson = await zabbixRes.json();

    if (!zabbixJson.result || zabbixJson.result.length === 0) {
      return NextResponse.json({
        result: { history: [] },
      });
    }

    // 🔁 WRAP history.get into the structure your chart already uses
    return NextResponse.json({
      result: {
        history: [
          {
            itemid: CPU_ITEMID,
            name: "CPU Utilization",
            key: "system.cpu.util",
            history: zabbixJson.result,
          },
        ],
      },
    });
  } catch (error) {
    console.error("CPU API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch CPU data" },
      { status: 500 }
    );
  }
}
