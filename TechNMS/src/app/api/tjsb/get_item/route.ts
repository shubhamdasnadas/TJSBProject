import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { auth, groupids, key_, name, itemid, itemids } =
      await req.json();

    /* ===================== VALIDATION ===================== */

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

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL as string;

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    /* ===================== BUILD PARAMS ===================== */

    const params: any = {
      output: [
        "itemid",
        "hostid",
        "key_",
        "lastvalue",
        "lastclock",
        "name",
        "units",
      ],
      sortfield: "name",
      selectHosts: ["hostid", "host", "name"], // ✅ host info
    };

    if (groupids) params.groupids = groupids;
    if (itemid) params.itemids = [itemid];
    if (itemids) params.itemids = itemids;

    /**
     * ⭐ PRIORITY
     * 1) name → search
     * 2) key_ → filter
     */
    if (name) {
      params.search = { name };
      params.searchByAny = true;            // ✅ match ANY string in array
      params.searchWildcardsEnabled = true; // partial match
    } else if (key_) {
      params.filter = { key_ };
    }

    /* ===================== PAYLOAD ===================== */

    const payload = {
      jsonrpc: "2.0",
      method: "item.get",
      params,
      id: 2,
    };

    const res = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
    });
    console.log("res", res.data.hosts?.[0]?.host )
    const result = res.data?.result ?? [];

    /* ===================== FORMAT RESPONSE ===================== */

    const formatted = result.map((item: any) => ({
      hostid: item.hostid,
      hostname: item.hosts?.[0]?.name ?? "Unknown",
      itemid: item.itemid,
      key_: item.key_,
      name: item.name,
      lastvalue: item.lastvalue,
      units: item.units,
    }));

    return NextResponse.json({ result: formatted });
  } catch (e: any) {
    console.error(
      "item.get error:",
      e?.response?.data || e?.message
    );

    return NextResponse.json(
      { error: "Server error fetching items" },
      { status: 500 }
    );
  }
}
