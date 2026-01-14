import { NextRequest, NextResponse } from "next/server";

/* =========================
   LOCAL ZABBIX CONFIG
========================= */
const ZABBIX_URL = "http://localhost:8080/api_jsonrpc.php";
const API_TOKEN =
  "b7b3f30c91bf343ff7ea4b169e08c7746c7e1c166f0aefb7f2930921c6a7690b";

/* =========================
   ZABBIX JSON-RPC HELPER
========================= */
async function zbxCall(method: string, params: any) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  const res = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: Math.floor(Math.random() * 100000),
    }),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.data || data.error.message);
  }
  return data.result;
}

/* =========================
   POST /api/zabbix-item-triggers
========================= */
export async function POST(req: NextRequest) {
  try {
    const { itemId, timeFrom, timeTill } = await req.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 }
      );
    }

    /* =========================
       1️⃣ ITEM INFO + TRIGGERS
    ========================= */
    const [items, triggers] = await Promise.all([
      zbxCall("item.get", {
        itemids: itemId,
        output: ["name", "value_type", "units"],
      }),
      zbxCall("trigger.get", {
        itemids: itemId,
        output: ["triggerid"],
        filter: { status: 0 },
      }),
    ]);

    if (!items?.length) {
      throw new Error("Item not found");
    }

    const item = items[0];
    const triggerIds = triggers.map((t: any) => t.triggerid);

    /* =========================
       2️⃣ HISTORY + EVENTS
    ========================= */
    const [history, events] = await Promise.all([
      zbxCall("history.get", {
        itemids: itemId,
        history: Number(item.value_type),
        time_from: timeFrom,
        time_till: timeTill,
        output: "extend",
        sortfield: "clock",
        sortorder: "ASC",
        limit: 1000,
      }),

      triggerIds.length
        ? zbxCall("event.get", {
            objectids: triggerIds,
            value: 1, // PROBLEM events only
            time_from: timeFrom,
            time_till: timeTill,
            output: ["clock"],
          })
        : [],
    ]);

    /* =========================
       3️⃣ RESPONSE SHAPE
    ========================= */
    return NextResponse.json({
      itemName: item.name,
      units: item.units,

      history: history.map((h: any) => ({
        time: Number(h.clock) * 1000,
        val: Number(h.value),
      })),

      events: events.map((e: any) => ({
        time: Number(e.clock) * 1000,
      })),
    });
  } catch (err: any) {
    console.error("Zabbix Orchestrator Error:", err.message);

    return NextResponse.json(
      { error: err.message },
      { status: 504 }
    );
  }
}
