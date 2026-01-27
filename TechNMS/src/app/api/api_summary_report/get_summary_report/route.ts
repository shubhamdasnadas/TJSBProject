import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/* =====================
   SPEED ITEM ONLY
===================== */

const SPEED_ITEM_NAME = [
  'Interface ["GigabitEthernet0/0/0"]: Speed',
  'Interface ["GigabitEthernet0/0/1"]: Speed',
];

/* =====================
   HELPERS
===================== */

const normalizeSpeedMbps = (value: any) => {
  const bits = Number(value);
  if (isNaN(bits)) return { value: "-", unit: "Mbps" };

  const mbps = bits / 1_000_000;

  return {
    value: Math.round(mbps),
    unit: "Mbps",
  };
};

/* =====================
   API HANDLER
===================== */

export async function POST(req: Request) {
  try {
    const { auth, groupids } = await req.json();

    if (!auth) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 400 });
    }

    if (!groupids) {
      return NextResponse.json({ error: "Missing groupids" }, { status: 400 });
    }

    const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const payload = {
      jsonrpc: "2.0",
      method: "item.get",
      params: {
        output: ["itemid", "hostid", "lastvalue", "name"],
        groupids,
        search: { name: SPEED_ITEM_NAME },
        searchByAny: true,
        searchWildcardsEnabled: true,
        selectHosts: ["hostid", "name"],
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

    const result = res.data?.result ?? [];

    // ✅ group host wise and map primary/secondary speed properly
    const grouped: Record<
      string,
      {
        hostid: string;
        hostname: string;
        primarySpeed: number | string;
        secondarySpeed: number | string;
      }
    > = {};

    result.forEach((item: any) => {
      const hostid = item.hostid;
      const hostname = item.hosts?.[0]?.name ?? "Unknown";

      if (!grouped[hostid]) {
        grouped[hostid] = {
          hostid,
          hostname,
          primarySpeed: "-",
          secondarySpeed: "-",
        };
      }

      const normalized = normalizeSpeedMbps(item.lastvalue);

      // ✅ Primary speed
      if (String(item.name).includes('GigabitEthernet0/0/0')) {
        grouped[hostid].primarySpeed = normalized.value;
      }

      // ✅ Secondary speed
      if (String(item.name).includes('GigabitEthernet0/0/1')) {
        grouped[hostid].secondarySpeed = normalized.value;
      }
    });

    return NextResponse.json({
      result: Object.values(grouped),
    });
  } catch (e: any) {
    console.error("Speed API error:", e?.message);
    return NextResponse.json(
      { error: "Server error fetching speed data" },
      { status: 500 }
    );
  }
}
