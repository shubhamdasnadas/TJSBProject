import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { hostids, auth, key_ } = await req.json();

    /* ================= VALIDATION ================= */

    if (!auth) {
      return NextResponse.json(
        { error: "Missing Zabbix auth token" },
        { status: 400 }
      );
    }

    if (!hostids || (Array.isArray(hostids) && hostids.length === 0)) {
      return NextResponse.json(
        { error: "Missing hostids" },
        { status: 400 }
      );
    }

    if (!key_ || (Array.isArray(key_) && key_.length === 0)) {
      return NextResponse.json(
        { error: "Missing item key_" },
        { status: 400 }
      );
    }

    /* ================= NORMALIZE INPUT ================= */

    const hostIdArray = Array.isArray(hostids) ? hostids : [hostids];
    const keyArray = Array.isArray(key_) ? key_ : [key_];

    /* ================= HTTPS AGENT ================= */

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL as string;

    /* ================= ZABBIX PAYLOAD ================= */

    const payload = {
      jsonrpc: "2.0",
      method: "item.get",
      params: {
        output: "extend",
        hostids: hostIdArray,
        filter: {
          key_: keyArray, // ✅ multiple keys
        },
        sortfield: "name",
      },
      auth,
      id: 1,
    };

    /* ================= REQUEST ================= */

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

    if (!response.data?.result) {
      return NextResponse.json(
        { error: response.data?.error || "Zabbix rejected the request" },
        { status: 403 }
      );
    }

    /* ================= GROUP BY KEY ================= */

    const groupedResult: Record<string, any[]> = {};

    keyArray.forEach((k) => {
      groupedResult[k] = [];
    });

    response.data.result.forEach((item: any) => {
      if (groupedResult[item.key_]) {
        groupedResult[item.key_].push(item);
      }
    });

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      result: groupedResult,
    });
  } catch (error: any) {
    console.error("item.get API error:", error.message);

    return NextResponse.json(
      { error: "Server error: Unable to reach Zabbix API" },
      { status: 500 }
    );
  }
}
