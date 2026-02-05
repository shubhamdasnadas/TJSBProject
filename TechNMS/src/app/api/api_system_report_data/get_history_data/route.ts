export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";

/* ================= TYPES ================= */

type HistoryType = 0 | 3;
type HistoryKey = "0" | "3";

type MetricDef = {
  name: string;
  historyType: HistoryType;
};

/* ================= CONFIG ================= */

const METRICS: MetricDef[] = [
  { name: "Memory utilization", historyType: 0 },
  { name: "CPU utilization", historyType: 0 },
  { name: 'Interface ["GigabitEthernet0/0/0"]: Bits sent', historyType: 3 },
  { name: 'Interface ["GigabitEthernet0/0/0"]: Bits received', historyType: 3 },
  { name: 'Interface ["GigabitEthernet0/0/0"]: Speed', historyType: 3 },
  { name: 'Interface ["GigabitEthernet0/0/1"]: Bits received', historyType: 3 },
  { name: 'Interface ["GigabitEthernet0/0/1"]: Bits sent', historyType: 3 },
  { name: 'Interface ["GigabitEthernet0/0/1"]: Speed', historyType: 3 },
];

const COLUMN_HEADER_MAP: Record<string, string> = {
  Hostname: "Host",
  branch: "Branch",
  "Memory utilization": "Memory Usage",
  "CPU utilization": "CPU Usage",
  'Interface ["GigabitEthernet0/0/0"]: Bits sent': "Primary Sent",
  'Interface ["GigabitEthernet0/0/0"]: Bits received': "Primary Received",
  'Interface ["GigabitEthernet0/0/0"]: Speed': "Primary Speed",
  'Interface ["GigabitEthernet0/0/1"]: Bits received': "Secondary Received",
  'Interface ["GigabitEthernet0/0/1"]: Bits sent': "Secondary Sent",
  'Interface ["GigabitEthernet0/0/1"]: Speed': "Secondary Speed",
};

/* ⚡ SPEED TUNING */
const ITEM_BATCH_SIZE = 15;          // ⬆️ was 5
const HISTORY_FETCH_DELAY_MS = 150;  // ⬇️ was 800

const THRESHOLD = 75;

/* ================= PATHS ================= */

const DATA_DIR = path.join(process.cwd(), "data");
const STATUS_FILE = path.join(DATA_DIR, "system_report_status.json");
const CSV_FILE = path.join(DATA_DIR, "history_system_report.csv");

/* ================= HELPERS ================= */

const writeStatus = (data: any) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), "utf8");
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const escapeCSV = (v: any) => {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function formatTraffic(bits: number) {
  const kbps = bits / 1000;
  return kbps < 1000
    ? `${kbps.toFixed(2)} Kbps`
    : `${(kbps / 1000).toFixed(2)} Mbps`;
}

/* ================= HISTORY ================= */

async function fetchHistory(params: {
  ZABBIX_URL: string;
  auth: string;
  httpsAgent: https.Agent;
  historyType: HistoryType;
  itemids: string[];
  timeFrom: number;
  timeTill: number;
  itemToHost: Record<string, string>;
  itemToMetric: Record<string, string>;
  stats: Record<string, Record<string, { sum: number; count: number }>>;
}) {
  let lastClock = params.timeFrom;

  while (true) {
    const res = await axios.post(
      params.ZABBIX_URL,
      {
        jsonrpc: "2.0",
        method: "history.get",
        params: {
          history: params.historyType,
          itemids: params.itemids,
          time_from: lastClock,
          time_till: params.timeTill,
          sortfield: "clock",
          sortorder: "ASC",
          output: ["itemid", "clock", "value"],
        },
        id: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${params.auth}`,
          "Content-Type": "application/json-rpc",
        },
        httpsAgent: params.httpsAgent,
      }
    );

    const history = res.data?.result ?? [];
    if (!history.length) break;

    for (const h of history) {
      const v = Number(h.value);
      if (Number.isNaN(v)) continue;

      const host = params.itemToHost[h.itemid];
      const metric = params.itemToMetric[h.itemid];
      if (!host || !metric) continue;

      params.stats[host] ??= {};
      params.stats[host][metric] ??= { sum: 0, count: 0 };
      params.stats[host][metric].sum += v;
      params.stats[host][metric].count++;
    }

    lastClock = Number(history.at(-1).clock) + 1;
    await delay(HISTORY_FETCH_DELAY_MS);
  }
}

/* ================= CSV GENERATOR ================= */

async function generateCsv(auth: string, groupids: string[], ZABBIX_URL: string) {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  writeStatus({ status: "RUNNING", progress: 0 });

  const timeTill = Math.floor(Date.now() / 1000);
  const timeFrom = timeTill - 30 * 24 * 60 * 60;

  const metricNames = METRICS.map((m) => m.name);

  const itemRes = await axios.post(
    ZABBIX_URL,
    {
      jsonrpc: "2.0",
      method: "item.get",
      params: {
        output: ["itemid", "hostid", "name"],
        groupids,
        search: { name: metricNames },
        searchByAny: true,
        selectHosts: ["name"],
      },
      id: 1,
    },
    { headers: { Authorization: `Bearer ${auth}` }, httpsAgent }
  );

  const items = itemRes.data?.result ?? [];

  const itemToHost: Record<string, string> = {};
  const itemToMetric: Record<string, string> = {};
  const hostMap: Record<string, string> = {};
  const itemsByType: Record<HistoryKey, string[]> = { "0": [], "3": [] };

  for (const it of items) {
    const m = METRICS.find((x) => it.name.includes(x.name));
    const key = String(m?.historyType ?? 0) as HistoryKey;
    itemsByType[key].push(it.itemid);
    itemToHost[it.itemid] = it.hostid;
    itemToMetric[it.itemid] = it.name;
    hostMap[it.hostid] = it.hosts?.[0]?.name ?? "Unknown";
  }

  const stats: any = {};
  let done = 0;
  const total =
    chunkArray(itemsByType["0"], ITEM_BATCH_SIZE).length +
    chunkArray(itemsByType["3"], ITEM_BATCH_SIZE).length;

  for (const t of [0, 3] as const) {
    for (const batch of chunkArray(itemsByType[String(t) as HistoryKey], ITEM_BATCH_SIZE)) {
      await fetchHistory({
        ZABBIX_URL,
        auth,
        httpsAgent,
        historyType: t,
        itemids: batch,
        timeFrom,
        timeTill,
        itemToHost,
        itemToMetric,
        stats,
      });
      writeStatus({ status: "RUNNING", progress: Math.round((++done / total) * 100) });
    }
  }

  const rawHeaders = ["Hostname", ...metricNames];
  const csvHeaders = rawHeaders.map((h) => COLUMN_HEADER_MAP[h] || h);

  const rows = Object.keys(hostMap).map((hostid) => {
    const r: any = { Hostname: hostMap[hostid] };

    for (const m of METRICS) {
      const s = stats[hostid]?.[m.name];
      if (!s) {
        r[m.name] = "N/A";
      } else if (m.historyType === 3) {
        r[m.name] = formatTraffic(s.sum / s.count);
      } else {
        const avg = Number((s.sum / s.count).toFixed(2));
        r[m.name] = avg > THRESHOLD ? `${avg} (HIGH)` : avg;
      }
    }
    return r;
  });

  const csv =
    csvHeaders.map(escapeCSV).join(",") +
    "\n" +
    rows.map((r) => rawHeaders.map((h) => escapeCSV(r[h])).join(",")).join("\n");

  fs.writeFileSync(CSV_FILE, csv, "utf8");
  writeStatus({ status: "DONE", progress: 100 });
}

/* ================= API ================= */

export async function POST(req: Request) {
  const { auth, groupids } = await req.json();
  const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;
  setTimeout(() => generateCsv(auth, groupids, ZABBIX_URL), 0);
  return NextResponse.json({ ok: true });
}
