import { NextResponse } from "next/server";

const ZABBIX_URL =
  "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";
const TOKEN ="60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

type Row = {
  eventid: string;
  time: string;
  status: string;
  host: string;
  problems: string;
  severity: string;
  duration: string;
  ack: string;
  message: string;
  clock: number;
};

async function zabbix(body: any) {
  const r = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      Authorization: "Bearer " + TOKEN,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) throw new Error(`Zabbix API failed: ${r.status}`);
  return r.json();
}

function formatDuration(sec: number) {
  if (sec < 60) return "1 min";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} hr ${m % 60} min`;
}

export async function GET() {
  try {
    const eventRes = await zabbix({
      jsonrpc: "2.0",
      method: "event.get",
      params: {
        output: [
          "eventid",
          "clock",
          "r_eventid",
          "severity",
          "acknowledged",
          "name",
        ],
        selectHosts: ["name"],
        selectAcknowledges: ["message"],
        sortfield: "eventid",
        sortorder: "DESC",
        limit: 500,
      },
      id: 1,
    });

    if (eventRes.error) throw new Error(eventRes.error.data);

    const now = Math.floor(Date.now() / 1000);

    const rows: Row[] = eventRes.result.map((e: any) => {
      const isResolved = e.r_eventid && e.r_eventid !== "0";
      const seconds = now - Number(e.clock);

      return {
        eventid: e.eventid,
        clock: Number(e.clock),
        time: new Date(Number(e.clock) * 1000).toLocaleString(),
        status: isResolved ? "Resolved" : "Problem",
        host: e.hosts?.[0]?.name ?? "Unknown",
        problems: e.name,
        severity: String(e.severity),
        duration: formatDuration(seconds),
        ack: e.acknowledged === "1" ? "Yes" : "No",
        message:
          e.acknowledges?.length
            ? e.acknowledges[e.acknowledges.length - 1].message || "-"
            : "-",
      };
    });

    rows.sort((a, b) => b.clock - a.clock);

    return NextResponse.json(
      rows.map(({ clock, ...rest }) => rest)
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
