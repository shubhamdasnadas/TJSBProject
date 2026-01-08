import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/*
  Expected POST body:
  {
    "itemids": "107196" | ["107196"],
    "startDate": "2025-12-15",
    "startTime": "10:00",
    "endDate": "2025-12-15",
    "endTime": "18:00",
    "history": 0, // 0=float, 1=string, 2=log, 3=uint, 4=text
    "auth": "ZABBIX_AUTH_TOKEN"
  }
*/

export async function POST(req: Request) {
  try {
    const {
      itemids,
      startDate,
      startTime,
      endDate,
      endTime,
      history = 0,
      auth,
    } = await req.json();

    /* ===================== VALIDATION ===================== */
    if (!auth) {
      return NextResponse.json(
        { error: "Missing Zabbix auth token" },
        { status: 401 }
      );
    }

    if (!itemids) {
      return NextResponse.json(
        { error: "Missing itemids" },
        { status: 400 }
      );
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      return NextResponse.json(
        { error: "Missing date/time range" },
        { status: 400 }
      );
    }

    /* ===================== TIME RANGE ===================== */
    const time_from = Math.floor(
      new Date(`${startDate} ${startTime}`).getTime() / 1000
    );

    const time_till = Math.floor(
      new Date(`${endDate} ${endTime}`).getTime() / 1000
    );

    if (time_from >= time_till) {
      return NextResponse.json(
        { error: "Invalid time range" },
        { status: 400 }
      );
    }

    /* ===================== HTTPS AGENT ===================== */
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // self-signed Zabbix cert
    });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    /* ===================== history.get PAYLOAD ===================== */
    const payload = {
      jsonrpc: "2.0",
      method: "history.get",
      params: {
        output: "extend",
        history,
        itemids: Array.isArray(itemids) ? itemids : [itemids],
        time_from,
        time_till,
        sortfield: "clock",
        sortorder: "ASC",
      },
      auth,
      id: 1,
    };

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
      },
      httpsAgent,
      timeout: 10000,
    });

    /* ===================== SUCCESS ===================== */
    if (response.data?.result) {
      return NextResponse.json({
        result: response.data.result,
        meta: {
          itemids,
          history,
          time_from,
          time_till,
          total_points: response.data.result.length,
        },
      });
    }

    /* ===================== ZABBIX ERROR ===================== */
    return NextResponse.json(
      {
        error: response.data?.error || "Zabbix rejected the request",
      },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("❌ history.get API error:", error.message || error);

    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
