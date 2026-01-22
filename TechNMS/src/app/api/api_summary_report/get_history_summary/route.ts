import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/*
  Expected POST body (from frontend):

  {
    auth: "ZABBIX_AUTH_TOKEN",
    hostid: "11223",          // optional (not used by Zabbix)
    itemids: ["34567","34568"],
    time_from: 1716200000,    // optional (unix seconds)
    time_till: 1716286400     // optional (unix seconds)
  }
*/

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      auth,
      itemids,
      time_from,
      time_till,
      history = 0, // 0 = numeric float (bits, speed, etc.)
    } = body;

    /* ===================== VALIDATION ===================== */

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

    /* ===================== TIME RANGE ===================== */

    const now = Math.floor(Date.now() / 1000);

    const from =
      typeof time_from === "number" ? time_from : now - 3600; // default 1h
    const till =
      typeof time_till === "number" ? time_till : now;

    if (from >= till) {
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
      process.env.NEXT_PUBLIC_ZABBIX_URL as string;

    /* ===================== ZABBIX PAYLOAD ===================== */

    const payload = {
      jsonrpc: "2.0",
      method: "history.get",
      params: {
        output: "extend",
        itemids: Array.isArray(itemids) ? itemids : [itemids],
        time_from: from,
        time_till: till,
        sortfield: "clock",
        sortorder: "DESC",
      },
    
      id: 1,
    };

    /* ===================== API CALL ===================== */

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
      timeout: 15000,
    });

    /* ===================== SUCCESS ===================== */

    if (response.data?.result) {
      return NextResponse.json({
        result: response.data.result,
        meta: {
          itemids: Array.isArray(itemids) ? itemids : [itemids],
          time_from: from,
          time_till: till,
          history,
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
    console.error("❌ history.get API error:", error?.message || error);

    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API" },
      { status: 500 }
    );
  }
}
