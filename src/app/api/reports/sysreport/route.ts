import { NextResponse } from "next/server";

const ZABBIX_URL = "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";
const TOKEN = "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

async function zabbix(body: any) {
  const r = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      "Authorization": "Bearer " + TOKEN
    },
    body: JSON.stringify(body)
  });

  if (!r.ok) {
    throw new Error(`Zabbix API request failed with status ${r.status}`);
  }

  return r.json();
}

/* =========================
   DURATION FORMATTER
========================= */
function formatDuration(seconds: number): string {
  if (seconds < 60) return "1 min";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0
    ? `${hours} hr`
    : `${hours} hr ${remainingMinutes} min`;
}

export async function GET() {
  try {
    const [problemRes, hostRes, eventRes] = await Promise.all([
      zabbix({
        jsonrpc: "2.0",
        method: "problem.get",
        params: {
          output: ["eventid", "clock", "r_clock", "severity", "acknowledged", "name"],
          sortfield: "eventid",
          sortorder: "DESC"
        },
        id: 1
      }),
      zabbix({
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "name"]
        },
        id: 3
      }),
      zabbix({
        jsonrpc: "2.0",
        method: "event.get",
        params: {
          output: ["eventid"],
          selectHosts: ["hostid"],
          selectAcknowledges: ["message"],
          sortfield: "eventid",
          sortorder: "DESC"
        },
        id: 7
      })
    ]);

    if (problemRes.error || hostRes.error || eventRes.error) {
      throw new Error(
        [problemRes.error, hostRes.error, eventRes.error]
          .filter(Boolean)
          .map(e => e.data)
          .join(", ")
      );
    }

    const hostMap = new Map(
      hostRes.result.map((h: any) => [h.hostid, h.name])
    );

    const eventHostMap = new Map(
      eventRes.result.map((e: any) => [e.eventid, e.hosts?.[0]?.hostid])
    );

    const messageMap = new Map(
      eventRes.result.map((e: any) => [
        e.eventid,
        e.acknowledges?.[0]?.message ?? "-"
      ])
    );

    const now = Math.floor(Date.now() / 1000);

    const data = problemRes.result.map((p: any) => {
      const seconds =
        p.r_clock && p.r_clock !== "0"
          ? p.r_clock - p.clock
          : now - p.clock;

      return {
        eventid: p.eventid,
        time: new Date(p.clock * 1000).toLocaleString(),
        status: p.r_clock && p.r_clock !== "0" ? "Resolved" : "Problem",
        host:
          hostMap.get(eventHostMap.get(p.eventid)) ?? "Unknown Host",
        problems: p.name,            // ✅ FIXED
        severity: p.severity,
        duration: formatDuration(seconds), // ✅ FIXED
        ack: p.acknowledged === "1" ? "Yes" : "No",
        message: messageMap.get(p.eventid) ?? "-"
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
