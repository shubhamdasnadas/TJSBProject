import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const body = await req.json();

  const { hostids } = body;

  /* 1️⃣ event.get — FILTER BY HOSTS + LATEST */
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
        output: ["eventid", "objectid", "clock"],
        source: 0, // trigger
        object: 0, // trigger
        value: 1, // PROBLEM
        hostids: hostids?.length ? hostids : undefined,
        sortfield: ["clock"],
        sortorder: "DESC",
        limit: 1000,
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

  /* 3️⃣ ONLY LATEST EVENT PER HOST+TRIGGER */
  const seen = new Set<string>();
  const rows: any[] = [];

  for (const e of events) {
    const trigger = triggerMap[e.objectid];
    if (!trigger) continue;

    const host = trigger.hosts?.[0]?.name ?? "Unknown";
    const key = `${host}||${trigger.description}`;

    if (seen.has(key)) continue; // 🔥 skip older ones

    seen.add(key);
    rows.push({
      key,
      host,
      trigger: trigger.description,
      severity: severityText(trigger.priority),
      count: 1, // latest problem only
    });
  }

  return NextResponse.json(rows);
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
