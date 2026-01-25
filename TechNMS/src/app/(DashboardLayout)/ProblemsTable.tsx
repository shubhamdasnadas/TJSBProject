"use client";

import React, { useEffect, useRef, useState } from "react";
import { Table, Tag, Checkbox, Button, Modal, Select } from "antd";
import axios from "axios";

const CACHE_KEY = "zabbix_problems_cache";

/* ===================== API RESPONSE TYPE ===================== */

interface ApiTriggerItem {
  eventid: string;
  clock: string;
  r_clock?: string;
  severity: string;
  name?: string;
  tags?: { tag: string; value?: string }[];
  trigger?: {
    triggerid: string;
    priority?: string;
    status?: string;
    description?: string;
    hosts?: { hostid: string; name: string }[];
  };
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
  tags?: { tag: string; value?: string }[];
}

/* ===================== COMPONENT ===================== */

export default function ProblemsTablePage() {
  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  const [host_group, setHost_group] = useState<any[]>([]);
  const [templateList, setTemplateList] = useState<any[]>([]);
  const [selectHost, setSelectHost] = useState<string[]>([]);
  const [selectGroup, setSelectGroup] = useState<string[]>([]);

  const [data, setData] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);

  const fetchingRef = useRef(false);
  const firstLoadRef = useRef(true);

  /* ===================== LOAD CACHE ===================== */

  useEffect(() => {
    // // const cached = sessionStorage.getItem(CACHE_KEY);
    // if (cached) {
    //   try {
    //     // setData(JSON.parse(cached));
    //     firstLoadRef.current = false;
    //   } catch {
    //     // sessionStorage.removeItem(CACHE_KEY);
    //   }
    // }
  }, []);

  /* ===================== TAG HELPERS ===================== */

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
    return <Tag>-</Tag>;
  };

  /* ===================== PROBLEM CELL COLOR (✅ NEW) ===================== */

  const getProblemBg = (priority: string) => {
    switch (priority) {
      case "5":
        return "#B22222"; // disaster
      case "4":
        return "#F59F1D"; // high
      case "3":
        return "#FAD800"; // average
      case "2":
        return "#ff9966"; // warning
      case "1":
        return "#79b1e6"; // info
      default:
        return "transparent";
    }
  };

  /* ===================== API FETCH ===================== */

  const fetchProblems = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (firstLoadRef.current) setLoading(true);

    try {
      const res = await axios.post("/api/zabbix/problem_table", {
        auth: user_token,
        hostids: selectHost,
        groupids: selectGroup,
      });

      const problems: ApiTriggerItem[] = Array.isArray(res.data?.result)
        ? res.data.result
        : [];

      const mapped: TableRow[] = problems.map((p, index) => ({
        key: p.eventid ?? String(index),
        triggerid: p.trigger?.triggerid ?? "",
        timestamp: p.clock ?? "",
        time_from: p.clock ? Number(p.clock) : undefined,
        time_till:
          p.r_clock && p.r_clock !== "0"
            ? Number(p.r_clock)
            : undefined,
        hostname: p.trigger?.hosts?.[0]?.name || "Unknown",
        hostid: p.trigger?.hosts?.[0]?.hostid
          ? String(p.trigger.hosts[0].hostid)
          : "",
        description: p.name || p.trigger?.description || "",
        priority: p.severity || p.trigger?.priority || "0",
        status: p.trigger?.status || "0",
        tags: Array.isArray(p.tags) ? p.tags : [],
      }));

      if (mapped.length) {
        setData(mapped);
        // sessionStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
      }

      firstLoadRef.current = false;
    } catch (err) {
      console.error("❌ Failed to fetch problems:", err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchProblems, 120000);
    return () => clearInterval(interval);
  }, []);

  /* ===================== COLUMNS ===================== */

  const columns = [
    { title: <Checkbox />, width: 40, render: () => <Checkbox /> },
    {
      title: "Time",
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
      width: 110,
      render: (p: string) => getSeverityTag(p),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 90,
      render: (s: string) => getStatusTag(s),
    },
    {
      title: "Host",
      dataIndex: "hostname",
      width: 140,
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: "Problem",
      dataIndex: "description",
      width: 280,
      render: (text: string, record: TableRow) => (
        <div
          style={{
            background: getProblemBg(record.priority),
            padding: "6px 8px",
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          {text}
        </div>
      ),
    },

  ];

  return (
    <div>
      {/* <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Active Problems</h2>
        <Button onClick={() => setFilterVisible(true)} disabled={loading}>
          Filter
        </Button>
      </div> */}
      <h2 style={{ fontSize: 22, fontWeight: 600 }}>Active Problems</h2>
      <Table
        rowKey="key"
        columns={columns}
        dataSource={data}
        loading={loading && data.length === 0}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        size="small"
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
