"use client";

import React, { useEffect, useState } from "react";
import { Card, Select, Button, Row, Col, Tag, Table } from "antd";
import axios from "axios";

/* =========================
   Types
========================= */
interface EventRow {
  key: string;
  time: string;
  recovery_time?: string;
  hostname: string;
  problem: string;
  severity: string;
  status: string;
}

export default function EventsPage() {
  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : "";

  const axiosCfg = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user_token}`,
    },
  };

  const [groups, setGroups] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [groupids, setGroupids] = useState<string[]>([]);
  const [hostids, setHostids] = useState<string[]>([]);
  const [data, setData] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* =========================
     Load host groups
  ========================= */
  useEffect(() => {
    axios
      .post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "hostgroup.get",
          params: { output: ["groupid", "name"] },
          id: 1,
        },
        axiosCfg
      )
      .then((r) => setGroups(r.data.result ?? []));
  }, []);

  /* =========================
     Load hosts
  ========================= */
  useEffect(() => {
    if (!groupids.length) {
      setHosts([]);
      return;
    }

    axios
      .post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "host.get",
          params: {
            output: ["hostid", "name"],
            groupids,
          },
          id: 2,
        },
        axiosCfg
      )
      .then((r) => setHosts(r.data.result ?? []));
  }, [groupids]);

  /* =========================
     Apply filters
  ========================= */
  const applyFilters = async () => {
    setLoading(true);

    try {
      const now = Math.floor(Date.now() / 1000);

      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "event.get",
          params: {
            output: [
              "eventid",
              "clock",
              "name",
              "severity",
              "value",
              "r_eventid",
            ],
            selectHosts: ["name"],
            source: 0,
            object: 0,
            groupids,
            hostids,
            time_from: now - 24 * 3600,
            sortfield: ["clock"],
            sortorder: "DESC",
            limit: 1000,
          },
          id: 3,
        },
        axiosCfg
      );

      const rows: EventRow[] = (r.data.result ?? []).map((e: any) => ({
        key: e.eventid,
        time: new Date(e.clock * 1000).toLocaleString(),
        recovery_time: e.r_clock
          ? new Date(e.r_clock * 1000).toLocaleString()
          : undefined,
        hostname: e.hosts?.[0]?.name ?? "Unknown",
        problem: e.name,
        severity: e.severity,
        status: e.value === "0" ? "RESOLVED" : "PROBLEM",
      }));

      setData(rows);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== PROBLEM BACKGROUND COLOR ===================== */
  const getProblemBg = (severity: string) => {
    switch (severity) {
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
        return "#51A687"; // default info
    }
  };

  /* ===================== SEVERITY TAG ===================== */
  const getSeverityTag = (severity: string) => {
    const map: Record<string, { color: string; label: string }> = {
      "5": { color: "red", label: "Disaster" },
      "4": { color: "volcano", label: "High" },
      "3": { color: "orange", label: "Average" },
      "2": { color: "gold", label: "Warning" },
      "1": { color: "blue", label: "Information" },
      "0": { color: "default", label: "Not classified" },
    };

    const item = map[severity] ?? map["0"];
    return <Tag color={item.color}>{item.label}</Tag>;
  };

  const columns = [
    { title: "Time", dataIndex: "time", width: 170 },
    {
      title: "Severity",
      dataIndex: "severity",
      width: 110,
      render: (s: string) => getSeverityTag(s),
    },
    {
      title: "Recovery time",
      dataIndex: "recovery_time",
      width: 170,
      render: (v: string) => v || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (s: string) =>
        s === "RESOLVED" ? (
          <Tag color="green">RESOLVED</Tag>
        ) : (
          <Tag color="red">PROBLEM</Tag>
        ),
    },
    { title: "Host", dataIndex: "hostname", width: 200 },
    {
      title: "Problem",
      dataIndex: "problem",
      width: 280,
      render: (text: string, record: EventRow) => (
        <div
          style={{
            background: getProblemBg(record.severity),
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
    <div style={{ padding: 24 }}>
      <Card title="Events">
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              mode="multiple"
              placeholder="Host Groups"
              style={{ width: "100%" }}
              options={groups.map((g) => ({
                value: g.groupid,
                label: g.name,
              }))}
              onChange={setGroupids}
            />
          </Col>

          <Col span={6}>
            <Select
              mode="multiple"
              placeholder="Hosts"
              style={{ width: "100%" }}
              options={hosts.map((h) => ({
                value: h.hostid,
                label: h.name,
              }))}
              onChange={setHostids}
            />
          </Col>

          <Col span={4}>
            <Button type="primary" onClick={applyFilters}>
              Apply
            </Button>
          </Col>
        </Row>

        <Table
          rowKey="key"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total: data.length,
            showSizeChanger: true,
            onChange: (p, s) => {
              setCurrentPage(p);
              setPageSize(s);
            },
          }}
        />
      </Card>
    </div>
  );
}