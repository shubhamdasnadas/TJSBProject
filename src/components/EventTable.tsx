"use client";

import React from "react";
import { Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";

/* =========================
   TYPES
========================= */
export type EventRow = {
  eventid: string;
  objectid: string;
  clock: number;
  r_clock?: number;
  host: string;
  severity: number;
  acknowledged: boolean;
  message: string;
};

/* =========================
   HELPERS
========================= */
const severityMap: Record<number, { text: string; color: string }> = {
  0: { text: "Not classified", color: "default" },
  1: { text: "Information", color: "blue" },
  2: { text: "Warning", color: "gold" },
  3: { text: "Average", color: "orange" },
  4: { text: "High", color: "red" },
  5: { text: "Disaster", color: "magenta" },
};

const formatTime = (ts: number) => new Date(ts * 1000).toLocaleString();

/* =========================
   LIVE DURATION CELL
========================= */
const DurationCell: React.FC<{
  start: number;
  end?: number;
}> = ({ start, end }) => {
  const diff = (end ?? Date.now() / 1000) - start;

  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = Math.floor(diff % 60);

  return <span>{`${h}h ${m}m ${s}s`}</span>;
};

/* =========================
   COLUMNS (7)
========================= */
const columns: ColumnsType<EventRow> = [
  {
    title: "Time",
    dataIndex: "clock",
    width: 170,
    render: (v: number) => formatTime(v),
  },
  {
    title: "Status",
    width: 110,
    render: (_, r) =>
      r.r_clock ? (
        <Tag color="green">Resolved</Tag>
      ) : (
        <Tag color="red">Problem</Tag>
      ),
  },
  {
    title: "Host",
    dataIndex: "host",
    width: 180,
  },
  {
    title: "Severity",
    dataIndex: "severity",
    width: 140,
    render: (s: number) => (
      <Tag color={severityMap[s]?.color}>{severityMap[s]?.text}</Tag>
    ),
  },
  {
    title: "Duration",
    width: 140,
    render: (_, r) => <DurationCell start={r.clock} end={r.r_clock} />,
  },
  {
    title: "Ack",
    dataIndex: "acknowledged",
    width: 80,
    render: (v: boolean) => (v ? "✔" : "✖"),
  },
  {
    title: "Message",
    dataIndex: "message",
    render: (v: string) => v || "-",
  },
];

/* =========================
   COMPONENT
========================= */
type Props = {
  data: EventRow[];
  loading?: boolean;
};

const EventTable: React.FC<Props> = ({ data, loading = false }) => {
  return (
    <Table<EventRow>
      rowKey="eventid"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={{ pageSize: 20 }}
      size="small"
      scroll={{ x: true }}
    />
  );
};

export default EventTable;
