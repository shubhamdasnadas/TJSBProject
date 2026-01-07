import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing Bearer token" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  const res = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "problem.get",
      params: {
        output: ["eventid", "severity", "name"],
        sortfield: "eventid",
        sortorder: "DESC",
        selectHosts: ["name"],
        selectTriggers: ["description", "priority"],
      },
      id: 1,
      auth: token,
    }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);

  // 🔹 Group like Zabbix UI
  const map = new Map<string, any>();

  json.result.forEach((p: any) => {
    const host = p.hosts?.[0]?.name ?? "Unknown";
    const trigger = p.name;
    const key = `${host}||${trigger}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        host,
        trigger,
        severity: severityText(p.severity),
        count: 0,
      });
    }

    map.get(key).count++;
  });

  return NextResponse.json(Array.from(map.values()));
}

function severityText(s: number) {
  return ["Not classified", "Information", "Warning", "Average", "High", "Disaster"][s];
}
