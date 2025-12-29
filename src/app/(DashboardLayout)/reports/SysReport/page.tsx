"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Table, Button, Tag, Space } from "antd";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================
   CONFIG
========================= */
const ZABBIX_URL =
  "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";

const TOKEN =
  "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

/* =========================
   TYPES
========================= */
type ProblemItem = {
  eventid: string;
  clock: number;
  r_clock: number;
  name: string;
  severity: number;
  acknowledged: string;
  hosts?: { host: string }[];
};

/* =========================
   HELPERS
========================= */
const severityMap: Record<number, { text: string; color: string }> = {
  0: { text: "Not classified", color: "#bfbfbf" },
  1: { text: "Information", color: "#1890ff" },
  2: { text: "Warning", color: "#faad14" },
  3: { text: "Average", color: "#fa8c16" },
  4: { text: "High", color: "#f5222d" },
  5: { text: "Disaster", color: "#a8071a" },
};

const formatTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString();

/* =========================
   LIVE DURATION CELL
========================= */
const DurationCell = ({ from, till }: { from: number; till?: number }) => {
  const [duration, setDuration] = useState("");

  useEffect(() => {
    const tick = () => {
      const start = from * 1000;
      const end = till ? till * 1000 : Date.now();
      const diff = end - start;

      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (d > 0) setDuration(`${d}d ${h}h ${m}m`);
      else if (h > 0) setDuration(`${h}h ${m}m ${s}s`);
      else if (m > 0) setDuration(`${m}m ${s}s`);
      else setDuration(`${s}s`);
    };

    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [from, till]);

  return <span>{duration}</span>;
};

/* =========================
   PAGE
========================= */
export default function ProblemsPage() {
  const [data, setData] = useState<ProblemItem[]>([]);
  const [loading, setLoading] = useState(false);

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    const fetchProblems = async () => {
      setLoading(true);

      const payload = {
        jsonrpc: "2.0",
        method: "problem.get",
        params: {
          output: [
            "eventid",
            "objectid",
            "clock",
            "r_clock",
            "name",
            "acknowledged",
            "severity",
          ],
          selectHosts: ["host"],
          recent: true,
          sortfield: ["eventid"],
          sortorder: "DESC",
        },
        id: 1,
      };

      const res = await axios.post(ZABBIX_URL, payload, {
        headers: {
          "Content-Type": "application/json-rpc",
          Authorization: `Bearer ${TOKEN}`,
        },
      });

      setData(res.data.result || []);
      setLoading(false);
    };

    fetchProblems();
  }, []);

  /* =========================
     PDF EXPORT
  ========================= */
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.text("Zabbix Problems Report", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [
        [
          "Time",
          "Status",
          "Host",
          "Severity",
          "Duration",
          "Remarks",
        ],
      ],
      body: data.map((p) => [
        formatTime(p.clock),
        p.r_clock ? "Resolved" : "Problem",
        p.hosts?.[0]?.host || "-",
        severityMap[p.severity].text,
        "-", // static in PDF
        p.name,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [24, 144, 255] },
      didParseCell: (d) => {
        if (d.column.index === 3) {
          const sev = data[d.row.index]?.severity;
          const c = severityMap[sev]?.color;
          if (c) d.cell.styles.textColor = c as any;
        }
      },
    });

    doc.save("zabbix-problems.pdf");
  };

  /* =========================
     TABLE COLUMNS
  ========================= */
  const columns = [
    {
      title: "Time",
      dataIndex: "clock",
      render: (v: number) => formatTime(v),
    },
    {
      title: "Status",
      render: (_: any, r: ProblemItem) =>
        r.r_clock ? (
          <Tag color="green">Resolved</Tag>
        ) : (
          <Tag color="red">Problem</Tag>
        ),
    },
    {
      title: "Host",
      render: (_: any, r: ProblemItem) =>
        r.hosts?.[0]?.host || "-",
    },
    {
      title: "Severity",
      render: (_: any, r: ProblemItem) => (
        <Tag color={severityMap[r.severity].color}>
          {severityMap[r.severity].text}
        </Tag>
      ),
    },
    {
      title: "Duration",
      render: (_: any, r: ProblemItem) =>
        r.clock ? (
          <DurationCell
            from={r.clock}
            till={r.r_clock || undefined}
          />
        ) : (
          "-"
        ),
    },
    {
      title: "Remarks",
      dataIndex: "name",
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Button type="primary" onClick={exportPDF}>
        Export PDF
      </Button>

      <Table
        rowKey="eventid"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </Space>
  );
}
