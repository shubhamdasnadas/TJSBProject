import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/* ===================== HELPERS ===================== */

/**
 * bits → K / M (base 1024)
 */
const normalizeBitsValue = (value: any) => {
  const bits = Number(value);
  if (isNaN(bits)) {
    return { value, unit: "" };
  }

  const kb = bits / 1024;

  if (kb >= 1024) {
    return {
      value: Number((kb / 1024).toFixed(2)),
      unit: "M",
    };
  }

  return {
    value: Number(kb.toFixed(2)),
    unit: "K",
  };
};

/**
 * CPU / Memory → 2 decimals
 */
const normalizePercentValue = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  return Number(num.toFixed(2));
};

/**
 * Fix reversed traffic names using key_
 */
const normalizeTrafficName = (name: string, key_: string) => {
  if (!name || !key_) return name;

  if (key_.includes("net.if.in")) {
    return name.replace(/Bits sent/i, "Bits received");
  }

  if (key_.includes("net.if.out")) {
    return name.replace(/Bits received/i, "Bits sent");
  }

  return name;
};

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
      selectHosts: ["hostid", "host", "name"],
    };

    if (groupids) params.groupids = groupids;
    if (itemid) params.itemids = [itemid];
    if (itemids) params.itemids = itemids;

    if (name) {
      params.search = { name };
      params.searchByAny = true;
      params.searchWildcardsEnabled = true;
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

    const result = res.data?.result ?? [];

    /* ===================== FORMAT RESPONSE ===================== */

    const formatted = result.map((item: any) => {
      let lastvalue = item.lastvalue;
      let units = item.units;
      let itemName = item.name;

      // ✅ Fix reversed column names
      itemName = normalizeTrafficName(itemName, item.key_);

      // 🔹 Traffic items (received + sent + speed)
      if (
        typeof itemName === "string" &&
        (itemName.includes("Bits received") ||
          itemName.includes("Bits sent") ||
          itemName.includes("Speed"))
      ) {
        const normalized = normalizeBitsValue(item.lastvalue);
        lastvalue = normalized.value;
        units = normalized.unit;
      }

      // 🔹 CPU / Memory
      if (
        typeof itemName === "string" &&
        (itemName.includes("CPU utilization") ||
          itemName.includes("Memory utilization"))
      ) {
        lastvalue = normalizePercentValue(item.lastvalue);
      }

      return {
        hostid: item.hostid,
        hostname: item.hosts?.[0]?.name ?? "Unknown",
        itemid: item.itemid,
        key_: item.key_,
        name: itemName,   // ✅ corrected heading
        lastvalue,
        units,
      };
    });

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
