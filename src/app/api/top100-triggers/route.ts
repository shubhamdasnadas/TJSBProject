import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const groupid = searchParams.get("groupid");
    const hostid = searchParams.get("hostid");

    /* ---------- Bearer token ---------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Bearer token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    /* ---------- Time range ---------- */
    const now = Math.floor(Date.now() / 1000);
    const time_from = now - 24 * 3600; // last 24h

    /* ---------- event.get (SAFE PARAMS) ---------- */
    const events = await zabbix(token, "event.get", {
      output: ["eventid", "name"],
      source: 0,    // trigger
      object: 0,    // trigger event
      value: 1,     // PROBLEM only
      selectHosts: ["hostid", "name"],
      groupids: groupid ? [groupid] : undefined,
      hostids: hostid ? [hostid] : undefined,
      time_from,
      time_till: now,
      sortfield: ["clock"],
      sortorder: "DESC",
      limit: 10000,
    });

    /* ---------- OCCURRENCE COUNT ---------- */
    const map = new Map<string, any>();

    for (const e of events) {
      if (!Array.isArray(e.hosts)) continue;

      for (const h of e.hosts) {
        const key = `${h.hostid}-${e.name}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            hostid: h.hostid,
            host: h.name,
            trigger: e.name,
            severity: "N/A",
            count: 0,
          });
        }

        map.get(key).count++;
      }
    }

    /* ---------- TOP 100 ---------- */
    const result = Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    return NextResponse.json({ triggers: result });
  } catch (err: any) {
    console.error("TOP100 TRIGGERS ERROR:", err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

/* ---------- ZABBIX JSON-RPC ---------- */
async function zabbix(token: string, method: string, params: any) {
  const res = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      auth: token,
      id: 1,
    }),
  });

  const json = await res.json();

  if (json.error) {
    throw new Error(json.error.data || json.error.message);
  }

  return json.result;
}
