import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/* =====================
   SPEED ITEM ONLY
===================== */

const SPEED_ITEM_NAME =
  'Interface ["GigabitEthernet0/0/0"]: Speed';

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
      return NextResponse.json(
        { error: "Missing auth token" },
        { status: 400 }
      );
    }

    if (!groupids) {
      return NextResponse.json(
        { error: "Missing groupids" },
        { status: 400 }
      );
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
        selectHosts: ["hostid", "name"], // ✅ REQUIRED
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

    const formatted = result.map((item: any) => {
      const normalized = normalizeSpeedMbps(item.lastvalue);

      return {
        hostid: item.hostid,                        // ✅ SEND HOST ID
        hostname: item.hosts?.[0]?.name ?? "Unknown",
        speed: normalized.value,
        unit: normalized.unit,
      };
    });

    return NextResponse.json({ result: formatted });
  } catch (e: any) {
    console.error("Speed API error:", e?.message);
    return NextResponse.json(
      { error: "Server error fetching speed data" },
      { status: 500 }
    );
  }
}
