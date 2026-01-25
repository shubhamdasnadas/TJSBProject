import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { auth, hostid, items } = await req.json();

    if (!auth || !hostid || !items?.length) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    /* =====================
       item.get PAYLOAD
    ===================== */

    const payload = {
      jsonrpc: "2.0",
      method: "item.get",
      params: {
        output: ["itemid", "name"],
        hostids: hostid,
        search: {
          name: items,
        },
        searchByAny: true,
        sortfield: "name",
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

    return NextResponse.json({
      result: res.data?.result ?? [],
    });
  } catch (e: any) {
    console.error("item.get error:", e?.response?.data || e?.message);
    return NextResponse.json(
      { error: "Failed to fetch interface items" },
      { status: 500 }
    );
  }
}
