import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const body = await req.json();

  // ⏱ last 24 hours (same as Zabbix default)
  const time_from =
    body.time_from ?? Math.floor(Date.now() / 1000) - 24 * 3600;

  /* 1️⃣ event.get (THIS IS TOP TRIGGERS SOURCE) */
  const eventRes = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "event.get",
      params: {
        output: ["eventid", "objectid"],
        source: 0, // trigger
        object: 0, // trigger
        value: 1, // PROBLEM
        time_from,
        sortfield: "eventid",
        sortorder: "DESC",
        limit: 5000,
      },
      id: 1,
    }),
  });

  const eventJson = await eventRes.json();
  if (eventJson.error) {
    return NextResponse.json(eventJson.error, { status: 500 });
  }

  const events = eventJson.result ?? [];

  /* 2️⃣ trigger.get */
  const triggerIds = Array.from(
    new Set(events.map((e: any) => e.objectid))
  );

  const triggerRes = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "trigger.get",
      params: {
        output: ["triggerid", "description", "priority"],
        triggerids: triggerIds,
        selectHosts: ["name"],
      },
      id: 2,
    }),
  });

  const triggerJson = await triggerRes.json();
  const triggerMap: Record<string, any> = {};

  (triggerJson.result ?? []).forEach((t: any) => {
    triggerMap[t.triggerid] = t;
  });

  /* 3️⃣ GROUP + COUNT(eventid) */
  const map: Record<string, any> = {};

  events.forEach((e: any) => {
    const trigger = triggerMap[e.objectid];
    if (!trigger) return;

    const host = trigger.hosts?.[0]?.name ?? "Unknown";
    const triggerName = trigger.description;
    const severity = severityText(trigger.priority);

    const key = `${host}||${triggerName}`;

    if (!map[key]) {
      map[key] = {
        key,
        host,
        trigger: triggerName,
        severity,
        count: 0,
      };
    }
    map[key].count++;
  });

  // 🔥 TOP 100
  const result = Object.values(map)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 100);

  return NextResponse.json(result);
}

function severityText(p: number) {
  return {
    0: "Not classified",
    1: "Information",
    2: "Warning",
    3: "Average",
    4: "High",
    5: "Disaster",
  }[p];
}
