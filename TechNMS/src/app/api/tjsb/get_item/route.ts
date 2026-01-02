import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { auth, groupids, key_, name, itemid, itemids } = await req.json();

    if (!auth) {
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 400 }
      );
    }

    if (!groupids && !itemid && !itemids) {
      return NextResponse.json(
        {
          error:
            "Missing required identifiers (groupids or itemid/itemids)",
        },
        { status: 400 }
      );
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;

    // ---- build params dynamically ----
    const params: any = {
      output: ["itemid", "hostid", "key_", "lastvalue", "lastclock", "name", "units"],
      sortfield: "name",
    };

    if (groupids) params.groupids = groupids;
    if (itemid) params.itemids = [itemid];
    if (itemids) params.itemids = itemids;

    // ⭐ PRIORITY: name → key_
    if (name) {
      params.search = { name };
      params.searchWildcardsEnabled = true;
    } else if (key_) {
      params.filter = { key_ };
    }

    const payload = {
      jsonrpc: "2.0",
      method: "item.get",
      params,
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
    console.error("item.get error:", e?.message);
    return NextResponse.json(
      { error: "Server error fetching items" },
      { status: 500 }
    );
  }
}
