import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/*
  POST body (minimum required):
  {
    "itemids": "107196" | ["107196"],
    "auth": "ZABBIX_AUTH_TOKEN"
  }

  Optional:
  {
    "startDate": "2025-12-15",
    "startTime": "10:00",
    "endDate": "2025-12-15",
    "endTime": "18:00",
    "history": 0
  }
*/

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      itemids,
      auth,
      history = 0,
      startDate,
      startTime,
      endDate,
      endTime,
    } = body;

    /* ===================== BASIC VALIDATION ===================== */
    if (!auth) {
      return NextResponse.json(
        { error: "Missing Zabbix auth token" },
        { status: 401 }
      );
    }

    if (!itemids || (Array.isArray(itemids) && itemids.length === 0)) {
      return NextResponse.json(
        { error: "Missing itemids" },
        { status: 400 }
      );
    }

    /* ===================== TIME RANGE LOGIC ===================== */
    let time_from: number;
    let time_till: number;

    const now = Math.floor(Date.now() / 1000);

    // 🔹 Case 1: Full date-time range provided
    if (startDate && startTime && endDate && endTime) {
      time_from = Math.floor(
        new Date(`${startDate} ${startTime}`).getTime() / 1000
      );

      time_till = Math.floor(
        new Date(`${endDate} ${endTime}`).getTime() / 1000
      );

      if (time_from >= time_till) {
        return NextResponse.json(
          { error: "Invalid time range" },
          { status: 400 }
        );
      }
    } 
    // 🔹 Case 2: No date-time → default last 1 hour
    else {
      time_till = now;
      time_from = now - 3600; // last 1 hour
    }

    /* ===================== HTTPS AGENT ===================== */
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // self-signed Zabbix cert
    });

   const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL as string;

    /* ===================== PAYLOAD ===================== */
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

    /* ===================== API CALL ===================== */
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
          itemids: Array.isArray(itemids) ? itemids : [itemids],
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
