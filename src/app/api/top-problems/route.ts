import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const groupid = searchParams.get("groupid");
  const hostid = searchParams.get("hostid");

  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  /* ---- Zabbix event.get ---- */
  const body: any = {
    jsonrpc: "2.0",
    method: "event.get",
    params: {
      output: ["eventid"],
      selectHosts: ["hostid", "name"],
      selectTriggers: ["description", "priority"],
      source: 0,
      object: 0,
      value: 1, // PROBLEM
      sortfield: ["eventid"],
      sortorder: "DESC",
      limit: 1000
    },
    id: 1
  };

  if (groupid) body.params.groupids = [groupid];
  if (hostid) body.params.hostids = [hostid];

  const zbxRes = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: auth
    },
    body: JSON.stringify(body)
  });

  const data = await zbxRes.json();

  /* ---- occurrence counting (Zabbix UI logic) ---- */
  const map: Record<string, any> = {};

  data.result.forEach((event: any) => {
    const trigger = event.triggers?.[0];
    if (!trigger) return;

    event.hosts.forEach((host: any) => {
      const key = `${host.hostid}_${trigger.description}`;

      if (!map[key]) {
        map[key] = {
          hostid: host.hostid,
          hostname: host.name,
          trigger: trigger.description,
          severity: trigger.priority,
          count: 0
        };
      }

      map[key].count++;
    });
  });

  return NextResponse.json(
    Object.values(map).sort((a: any, b: any) => b.count - a.count)
  );
}

