export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";
import fs from "fs";
import path from "path";
import crypto from "crypto";

type MetricDef = {
  name: string;
  historyType: 0 | 3;
};

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

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function formatTraffic(bitsPerSec: number) {
  const kbps = bitsPerSec / 1000;
  if (kbps < 1000) return `${kbps.toFixed(2)} Kbps`;
  return `${(kbps / 1000).toFixed(2)} Mbps`;
}

function escapeCsv(value: any) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function convertToCsv(headers: string[], rows: Record<string, any>[]) {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsv).join(","));
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  return lines.join("\n");
}

function writeJobStatus(statusPath: string, data: any) {
  const dir = path.dirname(statusPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(statusPath, JSON.stringify(data, null, 2), "utf8");
}

async function fetchHistoryPagedAndAggregate(params: {
  ZABBIX_URL: string;
  auth: string;
  httpsAgent: https.Agent;
  historyType: 0 | 3;
  itemids: string[];
  timeFrom: number;
  timeTill: number;
  itemToHost: Record<string, string>;
  itemToMetric: Record<string, string>;
  hostMetricStats: Record<string, Record<string, { sum: number; count: number }>>;
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
    hostMetricStats,
  } = params;

  let lastClock = timeFrom;
  let safetyCounter = 0;

  while (true) {
    safetyCounter += 1;
    if (safetyCounter > 2000) break;

    const historyPayload = {
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
      id: 2,
    };

    const historyRes = await axios.post(ZABBIX_URL, historyPayload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
      timeout: 60000,
    });

    const history: any[] = historyRes.data?.result ?? [];

    await delay(HISTORY_FETCH_DELAY_MS);

    if (!history.length) break;

    for (const h of history) {
      const itemid = String(h.itemid);
      const val = Number(h.value);
      if (Number.isNaN(val)) continue;

      const hostid = itemToHost[itemid];
      const metric = itemToMetric[itemid];

      if (!hostid || !metric) continue;

      if (!hostMetricStats[hostid]) hostMetricStats[hostid] = {};
      if (!hostMetricStats[hostid][metric]) {
        hostMetricStats[hostid][metric] = { sum: 0, count: 0 };
      }

      hostMetricStats[hostid][metric].sum += val;
      hostMetricStats[hostid][metric].count += 1;
    }

    const last = history[history.length - 1];
    const nextClock = Number(last.clock) + 1;

    if (!Number.isFinite(nextClock) || nextClock <= lastClock) break;
    lastClock = nextClock;
  }
}

async function generateCsvInBackground(params: {
  jobId: string;
  auth: string;
  groupids: string[];
  ZABBIX_URL: string;
}) {
  const { jobId, auth, groupids, ZABBIX_URL } = params;

  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  const reportsDir = path.join(process.cwd(), "public", "reports");
  fs.mkdirSync(reportsDir, { recursive: true });

  const statusPath = path.join(reportsDir, `status_${jobId}.json`);

  try {
    writeJobStatus(statusPath, {
      jobId,
      status: "RUNNING",
      progress: 0,
      fileName: null,
      fileUrl: null,
      error: null,
      data: [],
    });

    const timeTill = Math.floor(Date.now() / 1000);
    const timeFrom = timeTill - 30 * 24 * 60 * 60;

    const metricNames = METRICS.map((m) => m.name);

    const itemPayload = {
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
    };

    const itemRes = await axios.post(ZABBIX_URL, itemPayload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
      timeout: 60000,
    });

    const items: any[] = itemRes.data?.result ?? [];

    if (!items.length) {
      writeJobStatus(statusPath, {
        jobId,
        status: "DONE",
        progress: 100,
        fileName: null,
        fileUrl: null,
        error: null,
        data: [],
      });
      return;
    }

    const hostMap: Record<string, string> = {};
    const itemToHost: Record<string, string> = {};
    const itemToMetric: Record<string, string> = {};
    const itemsByHistoryType: Record<"0" | "3", string[]> = { "0": [], "3": [] };

    for (const it of items) {
      const hostid = String(it.hostid);
      const hostname = it.hosts?.[0]?.name ?? "Unknown";
      const itemid = String(it.itemid);
      const itemName = String(it.name);

      hostMap[hostid] = hostname;
      itemToHost[itemid] = hostid;

      const matchedMetric = metricNames.find((x) => itemName.includes(x)) ?? itemName;
      itemToMetric[itemid] = matchedMetric;

      const metricConfig = METRICS.find((m) => matchedMetric === m.name);
      const histType: 0 | 3 = metricConfig?.historyType ?? 0;

      itemsByHistoryType[String(histType) as "0" | "3"].push(itemid);
    }

    const hostMetricStats: Record<string, Record<string, { sum: number; count: number }>> = {};

    const allTypes: Array<0 | 3> = [0, 3];

    for (const histType of allTypes) {
      const ids = itemsByHistoryType[String(histType) as "0" | "3"];
      if (!ids || ids.length === 0) continue;

      const batches = chunkArray(ids, ITEM_BATCH_SIZE);

      let batchIndex = 0;
      for (const batch of batches) {
        batchIndex += 1;

        writeJobStatus(statusPath, {
          jobId,
          status: "RUNNING",
          progress: Math.round(((batchIndex - 1) / batches.length) * 100),
          fileName: null,
          fileUrl: null,
          error: null,
          data: [],
        });

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
          hostMetricStats,
        });
      }
    }

    const headers = ["Hostname", ...metricNames];

    const jsonRows = Object.keys(hostMap).map((hostid) => {
      const row: Record<string, any> = {};
      row["Hostname"] = hostMap[hostid] ?? "Unknown";

      for (const metricName of metricNames) {
        const stat = hostMetricStats?.[hostid]?.[metricName];

        if (!stat || stat.count === 0) {
          row[metricName] = "N/A";
          continue;
        }

        const avgRaw = stat.sum / stat.count;

        const metricConfig = METRICS.find((m) => m.name === metricName);
        if (metricConfig?.historyType === 3) {
          row[metricName] = formatTraffic(avgRaw);
        } else {
          row[metricName] = Number(avgRaw.toFixed(2));
        }
      }

      return row;
    });

    const csvContent = convertToCsv(headers, jsonRows);

    const fileName = `history_data_${Date.now()}.csv`;
    const filePath = path.join(reportsDir, fileName);

    fs.writeFileSync(filePath, csvContent, "utf8");

    writeJobStatus(statusPath, {
      jobId,
      status: "DONE",
      progress: 100,
      fileName,
      fileUrl: `/reports/${fileName}`,
      error: null,
      data: jsonRows,
    });
  } catch (err: any) {
    writeJobStatus(statusPath, {
      jobId,
      status: "FAILED",
      progress: 0,
      fileName: null,
      fileUrl: null,
      error: err?.message || "Report generation failed",
      data: [],
    });
  }
}

export async function POST(req: Request) {
  try {
    const { auth, groupids } = await req.json();

    if (!auth) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 400 });
    }

    if (!groupids || !groupids.length) {
      return NextResponse.json({ error: "Missing groupids" }, { status: 400 });
    }

    const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;
    if (!ZABBIX_URL) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_ZABBIX_URL in environment" },
        { status: 500 }
      );
    }

    const jobId = crypto.randomUUID();

    setTimeout(() => {
      generateCsvInBackground({
        jobId,
        auth,
        groupids,
        ZABBIX_URL,
      }).catch((e) => console.error("Background task failed:", e));
    }, 0);

    return NextResponse.json({
      ok: true,
      message: "Report generation started",
      jobId,
      // statusUrl: `/reports/status_${jobId}.json`,
    });
  } catch (e: any) {
    console.error("System report error:", e?.response?.data || e?.message);
    return NextResponse.json(
      { error: "Server error fetching system report" },
      { status: 500 }
    );
  }
}
