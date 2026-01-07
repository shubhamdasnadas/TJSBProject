import { NextResponse } from "next/server";

/* =========================
   ENV
========================= */
const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL;

if (!ZABBIX_URL) {
  throw new Error("NEXT_PUBLIC_ZABBIX_URL is not defined");
}

/* =========================
   TYPES
========================= */
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
  itemid?: string;
  clock: number;
};

/* =========================
   HELPERS
========================= */
async function zabbix(body: any) {
  const res = await fetch(ZABBIX_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (json.error) {
    throw new Error(json.error.data || "Zabbix API error");
  }

  return json;
}

function formatDuration(sec: number) {
  if (sec < 60) return "1 min";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} hr ${m % 60} min`;
}

/* =========================
   POST (test / ping)
========================= */
export async function POST() {
  const data = await zabbix({
    jsonrpc: "2.0",
    method: "apiinfo.version",
    params: {},
    id: 1,
  });

  return NextResponse.json(data);
}

/* =========================
   GET (Problems table)
========================= */
export async function GET() {
  try {
    /* 1️⃣ Events */
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
          "objectid", // triggerid
        ],
        selectHosts: ["name"],
        selectAcknowledges: ["message"],
        sortfield: "eventid",
        sortorder: "DESC",
        limit: 500,
      },
      id: 1,
    });

    /* 2️⃣ Trigger → Item map */
    const triggerIds = eventRes.result.map((e: any) => e.objectid);

    const triggerRes = await zabbix({
      jsonrpc: "2.0",
      method: "trigger.get",
      params: {
        triggerids: triggerIds,
        output: ["triggerid"],
        selectFunctions: ["itemid"],
      },
      id: 2,
    });

    const triggerItemMap: Record<string, string> = {};
    triggerRes.result.forEach((t: any) => {
      if (t.functions?.length) {
        triggerItemMap[t.triggerid] = t.functions[0].itemid;
      }
    });

    /* 3️⃣ Build rows */
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
        itemid: triggerItemMap[e.objectid],
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
