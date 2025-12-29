"use client";

import axios from "axios";
import { Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";

/* =========================
   Types
========================= */
type HostRow = {
  key: string;
  hostname: string;
  groups?: string[];
  primaryValue: number;
  secondaryValue: number;
};

/* =========================
   Config
========================= */
const CACHE_KEY = "if_status_cache";
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/* =========================
   Helpers
========================= */
const to01 = (v?: string) => (v === "1" ? 1 : 0);

const render01 = (value: number) => (
  <Tag
    color={value === 1 ? "green" : "red"}
    style={{ width: "100%", textAlign: "center" }}
  >
    {value}
  </Tag>
);

/* =========================
   Columns
========================= */
const columns = [
  {
    title: "Hostname",
    dataIndex: "hostname",
    key: "hostname",
    ellipsis: true,
  },
  {
    title: "Group",
    dataIndex: "groups",
    key: "groups",
    width: 220,
    render: (groups: string[] | undefined) => (
      <span>{(groups && groups.length > 0) ? groups.join(", ") : "-"}</span>
    ),
  },
  {
    title: "Primary Link",
    key: "primary",
    width: 140,
    render: (_: unknown, r: HostRow) => render01(r.primaryValue),
  },
  {
    title: "Secondary Link",
    key: "secondary",
    width: 140,
    render: (_: unknown, r: HostRow) => render01(r.secondaryValue),
  },
];

/* =========================
   API (via server route)
========================= */
async function fetchIfStatus(): Promise<HostRow[]> {
  const res = await axios.get("/api/tjsb/if_status");
  const rows: HostRow[] = res.data || [];

  // Sort: any link with 1 first (problems)
  rows.sort((a, b) => {
    const sevA = Math.max(a.primaryValue, a.secondaryValue);
    const sevB = Math.max(b.primaryValue, b.secondaryValue);
    if (sevA !== sevB) return sevB - sevA; // 1 first
    return a.hostname.localeCompare(b.hostname);
  });
  return rows;
}

/* =========================
   Main fetch (with cache)
========================= */
async function fetchTableDataWithCache(): Promise<HostRow[]> {
  // 1️⃣ Try cache
  const cachedRaw = localStorage.getItem(CACHE_KEY);
  if (cachedRaw) {
    const cached = JSON.parse(cachedRaw);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  // 2️⃣ Fetch fresh (from server API)
  const rows: HostRow[] = await fetchIfStatus();

  // 3️⃣ Save cache
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      timestamp: Date.now(),
      data: rows,
    })
  );

  return rows;
}

/* =========================
   Page
========================= */
export default function AvailabilityDataPage() {
  const [data, setData] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchTableDataWithCache()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Availability Data</Typography.Title>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </div>
  );
}
