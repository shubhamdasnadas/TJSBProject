import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const groupid = searchParams.get("groupid");
  const hostid = searchParams.get("hostid");

  /* 🔐 Read Bearer token */
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Bearer token" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "").trim();

  /* ⏱ last 24 hours */
  const now = Math.floor(Date.now() / 1000);
  const time_from = now - 24 * 3600;

  /* 🔥 EVENT-BASED (NOT problem.get) */
  const events = await zabbix(token, "event.get", {
    output: ["eventid", "name"],
    selectHosts: ["name"],
    source: 0,     // trigger events
    object: 0,     // trigger object
    value: 1,      // PROBLEM
    groupids: groupid ? [groupid] : undefined,
    hostids: hostid ? [hostid] : undefined,
    time_from,
    time_till: now,
    sortfield: ["clock"],
    sortorder: "DESC",
    limit: 10000,
  });

  /* ✅ OCCURRENCE COUNT (SAME AS PAGE) */
  const map = new Map<string, any>();

  events.forEach((e: any) => {
    e.hosts?.forEach((h: any) => {
      const key = `${h.name}-${e.name}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          host: h.name,
          trigger: e.name,
          severity: "N/A",
          count: 0,
        });
      }

      map.get(key).count++;
    });
  });

  return NextResponse.json({
    triggers: Array.from(map.values()),
  });
}

/* 🔁 ZABBIX CALL */
async function zabbix(token: string, method: string, params: any) {
  const res = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1,
      auth: token,
    }),
  });

  const json = await res.json();

  if (json.error) {
    throw new Error(json.error.data || json.error.message);
  }

  return json.result;
}
 