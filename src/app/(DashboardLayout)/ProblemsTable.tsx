"use client";

import React, { useEffect, useState } from "react";
import { Table, Tag, Checkbox, Button } from "antd";

/* ===================== API TRIGGER TYPE ===================== */

interface ApiTriggerItem {
  triggerid?: string;
  priority: string;
  hosts: { hostid: string; host: string; name: string }[];
  tags?: Array<{ tag: string; value?: string }>;
  lastchange?: string;
  description?: string;
  status?: string;
}

/* ===================== TABLE ROW TYPE ===================== */

interface TableRow {
  key: string;
  triggerid: string;
  timestamp: string;
  time_from?: number;
  time_till?: number;
  hostname: string;
  hostid: string;
  description: string;
  priority: string;
  status: string;
  depends_on?: string;
  tags?: Array<{ tag: string; value?: string }>;
}

/* ===================== COMPONENT ===================== */

export default function ProblemsTablePage() {
  /* ---------- STATE ---------- */
  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------- TAG HELPERS ---------- */
  const getSeverityTag = (priority: string) => {
    const map: Record<string, { color: string; label: string }> = {
      "5": { color: "red", label: "Disaster" },
      "4": { color: "volcano", label: "High" },
      "3": { color: "orange", label: "Average" },
      "2": { color: "gold", label: "Warning" },
      "1": { color: "blue", label: "Information" },
      "0": { color: "default", label: "Not classified" },
    };

    const entry = map[priority] ?? { color: "default", label: "Unknown" };
    return <Tag color={entry.color}>{entry.label}</Tag>;
  };

  const getStatusTag = (status: string) => {
    if (status === "0") return <Tag color="red">Problem</Tag>;
    if (status === "1") return <Tag color="green">OK</Tag>;
    return <Tag color="default">-</Tag>;
  };

  /* ===================== API FETCH (ONLY FOR TABLE) ===================== */

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://192.168.56.1:3000/api/zabbix/problem_table", { method: "POST" });
      const json = await res.json();

      const triggers: ApiTriggerItem[] = Array.isArray(json?.result)
        ? json.result
        : [];

      const mapped: TableRow[] = triggers.map((t, index) => ({
        key: t.triggerid ?? String(index),
        triggerid: t.triggerid ?? String(index),
        timestamp: t.lastchange ?? "",
        time_from: t.lastchange ? Number(t.lastchange) : undefined,
        time_till: undefined,
        hostname:
          t.hosts?.[0]?.name || t.hosts?.[0]?.host || "Unknown",
        hostid: t.hosts?.[0]?.hostid || "",
        description: t.description || "",
        priority: t.priority || "0",
        status: t.status || "0",
        depends_on: undefined,
        tags: Array.isArray(t.tags) ? t.tags : [],
      }));

      setData(mapped);
    } catch (err) {
      console.error("❌ Failed to fetch problems:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- EFFECT ---------- */
  useEffect(() => {
    setTimeout(() => {
    fetchProblems();
    }, 60000);
  }, []);

  /* ===================== TABLE COLUMNS ===================== */

  const columns = [
    {
      title: <Checkbox />,
      key: "select",
      width: 40,
      render: () => <Checkbox />,
    },
    {
      title: "Time",
      key: "time",
      width: 160,
      render: (_: any, record: TableRow) => {
        if (!record.time_from) return "-";

        const date = new Date(record.time_from * 1000);
        return (
          <div>
            <div style={{ fontWeight: 600, color: "#1677ff" }}>
              {date.toLocaleTimeString()}
            </div>
            <div style={{ fontSize: 11, color: "#999" }}>
              {date.toLocaleDateString()}
            </div>
          </div>
        );
      },
    },
    {
      title: "Severity",
      dataIndex: "priority",
      key: "priority",
      width: 110,
      render: (p: string) => getSeverityTag(p),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (s: string) => getStatusTag(s),
    },
    {
      title: "Host",
      dataIndex: "hostname",
      key: "hostname",
      width: 140,
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: "Problem",
      dataIndex: "description",
      key: "description",
      width: 280,
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: "Tags",
      key: "tags",
      width: 300,
      render: (_: any, record: TableRow) => {
        if (!record.tags?.length) return "-";

        const colors = ["blue", "green", "orange", "purple", "cyan"];

        return (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {record.tags.map((tag, i) => (
              <Tag key={i} color={colors[i % colors.length]}>
                {tag.tag}
                {tag.value ? `: ${tag.value}` : ""}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: () => (
        <Button type="link" size="small">
          Actions
        </Button>
      ),
    },
  ];

  /* ===================== UI ===================== */

  return (
    <div style={{ padding: 24 }}>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>
          Active Problems
        </h2>
        <Button
          onClick={fetchProblems}
          style={{ marginBottom: 12 }}
          disabled={loading}
        >
          Filter
        </Button>
      </div>
      <Table
        rowKey="key"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: true }}
        size="small"
      />
    </div>
  );
}
