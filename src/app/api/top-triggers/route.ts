import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const groupid = searchParams.get("groupid");
  const hostid = searchParams.get("hostid");
  const severity = searchParams.get("severity");

  /* 🔐 Read Bearer token */
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Bearer token" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "").trim();

  // 1️⃣ Host groups
  if (!groupid && !hostid && !severity) {
    const groups = await zabbix(token, "hostgroup.get", {
      output: ["groupid", "name"],
    });
    return NextResponse.json({ groups });
  }

  // 2️⃣ Hosts by group
  if (groupid && !hostid) {
    const hosts = await zabbix(token, "host.get", {
      output: ["hostid", "name"],
      groupids: [groupid],
    });
    return NextResponse.json({ hosts });
  }

  // 3️⃣ Top 100 triggers (active problems)
  const problems = await zabbix(token, "problem.get", {
    output: "extend",
    sortfield: "eventid",
    sortorder: "DESC",
    limit: 100,
    severities: severity ? [Number(severity)] : undefined,
    groupids: groupid ? [groupid] : undefined,
    hostids: hostid ? [hostid] : undefined,
    selectHosts: ["name"],
    selectTriggers: ["description", "priority"],
  });

  const map = new Map<string, any>();

  problems.forEach((p: any) => {
    const host = p.hosts?.[0]?.name ?? "Unknown";
    const trigger = p.name;
    const key = `${host}-${trigger}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        host,
        trigger,
        severity: priorityToText(p.severity),
        count: 0,
      });
    }

    map.get(key).count++;
  });

  return NextResponse.json({
    triggers: Array.from(map.values()),
  });
}

/* 🔁 ZABBIX CALL — FIXED AUTH */
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
      auth: token, // 🔥 THIS LINE FIXES "Not authorized"
    }),
  });

  const json = await res.json();

  if (json.error) {
    console.error("Zabbix error:", json.error);
    throw new Error(json.error.data || json.error.message);
  }

  return json.result;
}

/* 🔢 Severity text */
function priorityToText(p: number) {
  return {
    0: "Not classified",
    1: "Information",
    2: "Warning",
    3: "Average",
    4: "High",
    5: "Disaster",
  }[p];
}
