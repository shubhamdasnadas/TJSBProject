"use client";

import React, { useEffect, useState } from "react";
import { Table, Tag, Checkbox, Button, Modal, Select } from "antd";
import axios from "axios";

/* ===================== API RESPONSE TYPE (problem.get) ===================== */

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
  depends_on?: string;
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
    if (status === "0") {
      return <Tag color="red">Problem</Tag>;
    }

    if (status === "1") {
      return <Tag color="green">OK</Tag>;
    }

    return <Tag>-</Tag>;
  };


  /* ===================== API FETCH ===================== */

  const fetchProblems = async () => {
    setLoading(true);

    try {
      const res = await axios.post("/api/zabbix/problem_table", {
        auth: user_token,
        hostids: selectHost,
        groupids: selectGroup,
      });

      const problems: ApiTriggerItem[] = Array.isArray(res.data?.result)
        ? res.data.result
        : [];

      /* ===================== MAP API → TABLE ===================== */

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

        description:
          p.name ||
          p.trigger?.description ||
          "",

        priority: p.severity || p.trigger?.priority || "0",
        status: p.trigger?.status || "0",

        depends_on: undefined,
        tags: Array.isArray(p.tags) ? p.tags : [],
      }));

      setData(mapped);
    } catch (err) {
      console.error("❌ Failed to fetch problems:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== EFFECT ===================== */

  useEffect(() => {
    fetchProblems();
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

  /* ===================== FILTER UI ===================== */

  const handleGetHostGroup = async () => {
    try {
      const res = await axios.post("/api/api_host/api_host_group", {
        auth: user_token,
      });
      setHost_group(res.data.result);
    } catch {
      console.log("Error host group");
    }
  };

  const handleGetHostList = async (groupid: any) => {
    try {
      const res = await axios.post("/api/api_host/api_get_host", {
        auth: user_token,
        groupids: groupid,
      });
      setTemplateList(res.data.result);
    } catch {
      console.log("error template list");
    }
  };

  /* ===================== UI ===================== */

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Active Problems</h2>
        <Button
          onClick={() => {
            setFilterVisible(true);
            handleGetHostGroup();
          }}
          disabled={loading}
        >
          Filter
        </Button>
      </div>

      <Modal
        title="Filter Problems"
        open={filterVisible}
        onOk={() => {
          setFilterVisible(false);
          fetchProblems();
        }}
        onCancel={() => setFilterVisible(false)}
      >
        <Select
          style={{ width: "100%" }}
          mode="multiple"
          placeholder="Select Group"
          onChange={(v) => {
            setSelectGroup(v as string[]);
            handleGetHostList(v);
          }}
        >
          {host_group.map((g: any) => (
            <Select.Option key={g.groupid} value={g.groupid}>
              {g.name}
            </Select.Option>
          ))}
        </Select>

        <Select
          style={{ width: "100%", marginTop: 16 }}
          mode="multiple"
          placeholder="Select Host"
          onChange={(v) => setSelectHost(v as string[])}
        >
          {templateList.map((h: any) => (
            <Select.Option key={h.hostid} value={h.hostid}>
              {h.name}
            </Select.Option>
          ))}
        </Select>
      </Modal>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        size="small"
        style={{ marginTop: 16 }}
      />
    </div>
  );
}
