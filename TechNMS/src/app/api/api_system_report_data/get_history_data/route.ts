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
  { name: 'Interface ["GigabitEthernet0/0/1"]: Bits received', historyType: 3 },
  { name: 'Interface ["GigabitEthernet0/0/1"]: Bits sent', historyType: 3 },
];

const ITEM_BATCH_SIZE = 5;
const HISTORY_FETCH_DELAY_MS = 800;

/* ================= PATHS ================= */

const DATA_DIR = path.join(process.cwd(), "data");
const STATUS_FILE = path.join(DATA_DIR, "system_report_status.json");

/* ================= HELPERS ================= */

const writeStatus = (data: any) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2), "utf8");
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function formatTraffic(bitsPerSec: number) {
  const kbps = bitsPerSec / 1000;
  return kbps < 1000
    ? `${kbps.toFixed(2)} Kbps`
    : `${(kbps / 1000).toFixed(2)} Mbps`;
}

/* ================= HISTORY ================= */

async function fetchHistoryPagedAndAggregate(params: {
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
  const {
    ZABBIX_URL,
    auth,
    httpsAgent,
    historyType,
    itemids,
    timeFrom,
    timeTill,
    itemToHost,
    itemToMetric,
    stats,
  } = params;

  let lastClock = timeFrom;

  while (true) {
    const res = await axios.post(
      ZABBIX_URL,
      {
        jsonrpc: "2.0",
        method: "history.get",
        params: {
          history: historyType,
          itemids,
          time_from: lastClock,
          time_till: timeTill,
          sortfield: "clock",
          sortorder: "ASC",
          output: ["itemid", "clock", "value"],
        },
        id: 1,
      },
      {
        headers: {
          "Content-Type": "application/json-rpc",
          Authorization: `Bearer ${auth}`,
        },
        httpsAgent,
      }
    );

    const history = res.data?.result ?? [];
    if (!history.length) break;

    for (const h of history) {
      const v = Number(h.value);
      if (Number.isNaN(v)) continue;

      const host = itemToHost[h.itemid];
      const metric = itemToMetric[h.itemid];
      if (!host || !metric) continue;

      stats[host] ??= {};
      stats[host][metric] ??= { sum: 0, count: 0 };
      stats[host][metric].sum += v;
      stats[host][metric].count++;
    }

    lastClock = Number(history.at(-1).clock) + 1;
    await delay(HISTORY_FETCH_DELAY_MS);
  }
}

/* ================= GENERATOR ================= */

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
    {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
    }
  );

  const items = itemRes.data?.result ?? [];

  const itemsByType: Record<HistoryKey, string[]> = { "0": [], "3": [] };
  const itemToHost: Record<string, string> = {};
  const itemToMetric: Record<string, string> = {};
  const hostMap: Record<string, string> = {};

  for (const it of items) {
    const m = METRICS.find((x) => it.name.includes(x.name));
    const key = String(m?.historyType ?? 0) as HistoryKey;

    itemsByType[key].push(it.itemid);
    itemToHost[it.itemid] = it.hostid;
    itemToMetric[it.itemid] = it.name;
    hostMap[it.hostid] = it.hosts?.[0]?.name ?? "Unknown";
  }

  const stats: Record<string, Record<string, { sum: number; count: number }>> =
    {};

  let completed = 0;
  const total =
    chunkArray(itemsByType["0"], ITEM_BATCH_SIZE).length +
    chunkArray(itemsByType["3"], ITEM_BATCH_SIZE).length;

  for (const histType of [0, 3] as const) {
    const batches = chunkArray(itemsByType[String(histType) as HistoryKey], ITEM_BATCH_SIZE);

    for (const batch of batches) {
      await fetchHistoryPagedAndAggregate({
        ZABBIX_URL,
        auth,
        httpsAgent,
        historyType: histType,
        itemids: batch,
        timeFrom,
        timeTill,
        itemToHost,
        itemToMetric,
        stats,
      });

      completed++;
      writeStatus({
        status: "RUNNING",
        progress: Math.round((completed / total) * 100),
      });
    }
  }

  const headers = ["Hostname", ...metricNames];
  const rows = Object.keys(hostMap).map((hostid) => {
    const row: any = { Hostname: hostMap[hostid] };
    for (const m of METRICS) {
      const s = stats[hostid]?.[m.name];
      row[m.name] = !s
        ? "N/A"
        : m.historyType === 3
        ? formatTraffic(s.sum / s.count)
        : Number((s.sum / s.count).toFixed(2));
    }
    return row;
  });

  const csv = [headers, ...rows.map((r) => headers.map((h) => r[h]))]
    .map((r) => r.join(","))
    .join("\n");

  const fileName = `history_system_report.csv`;
  fs.writeFileSync(path.join(DATA_DIR, fileName), csv);

  writeStatus({ status: "DONE", progress: 100, fileName });
}

/* ================= API ================= */

export async function POST(req: Request) {
  const { auth, groupids } = await req.json();
  const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;

  setTimeout(() => generateCsv(auth, groupids, ZABBIX_URL), 0);

  return NextResponse.json({ ok: true });
}
