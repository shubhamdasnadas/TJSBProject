import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/* ===================== HOST2 ITEM NAMES ===================== */

const HOST2_ITEMS = {
  BITS_SENT: 'Interface ["GigabitEthernet0/0/0"]: Bits sent',
  BITS_RECEIVED: 'Interface ["GigabitEthernet0/0/0"]: Bits received',
  SPEED: 'Interface ["GigabitEthernet0/0/0"]: Speed',
  CPU: "CPU utilization",
  MEMORY: "Memory utilization",
  CERT: "Certificate validity",
};

const HOST2_ITEM_NAMES = Object.values(HOST2_ITEMS);

/* ===================== HELPERS ===================== */

const normalizeBitsValue = (value: any) => {
  const bits = Number(value);
  if (isNaN(bits)) return { value, unit: "" };

  const kb = bits / 1000;
  if (kb >= 1000) {
    return { value: Number((kb / 1000).toFixed(2)), unit: "M" };
  }
  return { value: Number(kb.toFixed(2)), unit: "K" };
};

const normalizePercentValue = (value: any) => {
  const num = Number(value);
  if (isNaN(num)) return value;
  return Number(num.toFixed(2));
};

const getUtilizationColor = (value: number) => {
  if (value < 50) return "green";
  if (value < 75) return "orange";
  return "red";
};

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

    if (!auth) {
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 400 }
      );
    }

    if (!groupids && !itemid && !itemids) {
      return NextResponse.json(
        { error: "Missing required identifiers" },
        { status: 400 }
      );
    }

    const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

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

    let result = res.data?.result ?? [];

    /* ===================== SORT: HOST2 BITS RECEIVED ONLY ===================== */

    const host2BitsReceived = result.filter(
      (i: any) => i.name === HOST2_ITEMS.BITS_RECEIVED
    );

    const others = result.filter(
      (i: any) => i.name !== HOST2_ITEMS.BITS_RECEIVED
    );

    host2BitsReceived.sort(
      (a: any, b: any) => Number(b.lastvalue) - Number(a.lastvalue)
    );

    result = [...host2BitsReceived, ...others];

    /* ===================== FORMAT RESPONSE ===================== */

    const formatted = result.map((item: any) => {
      let lastvalue: any = item.lastvalue;
      let units = item.units;
      let itemName = normalizeTrafficName(item.name, item.key_);
      let statusColor: string | undefined;

      const isHost2Item = HOST2_ITEM_NAMES.includes(itemName);

      /* 🔹 HOST2 ONLY: Bits */
      if (
        isHost2Item &&
        [
          HOST2_ITEMS.BITS_SENT,
          HOST2_ITEMS.BITS_RECEIVED,
          HOST2_ITEMS.SPEED,
        ].includes(itemName)
      ) {
        const normalized = normalizeBitsValue(item.lastvalue);
        lastvalue = normalized.value;
        units = normalized.unit;
      }

      /* 🔹 HOST2 ONLY: CPU / Memory */
      if (
        isHost2Item &&
        [HOST2_ITEMS.CPU, HOST2_ITEMS.MEMORY].includes(itemName)
      ) {
        const val = normalizePercentValue(item.lastvalue);
        lastvalue = val;
        statusColor = getUtilizationColor(val);
      }

      /* 🔹 HOST2 ONLY: zero handling */
      if (
        isHost2Item &&
        Number(lastvalue) === 0 &&
        itemName !== HOST2_ITEMS.CERT
      ) {
        lastvalue = "NA";
        statusColor = undefined;
      }

      /* ❌ No color for Certificate validity */
      if (itemName === HOST2_ITEMS.CERT) {
        statusColor = undefined;
      }

      return {
        hostid: item.hostid,
        hostname: item.hosts?.[0]?.name ?? "Unknown",
        itemid: item.itemid,
        key_: item.key_,
        name: itemName,
        lastvalue,
        units,
        statusColor,
      };
    });

    return NextResponse.json({ result: formatted });
  } catch (e: any) {
    console.error("item.get error:", e?.response?.data || e?.message);
    return NextResponse.json(
      { error: "Server error fetching items" },
      { status: 500 }
    );
  }
}
