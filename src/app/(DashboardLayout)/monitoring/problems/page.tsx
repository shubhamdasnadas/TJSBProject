"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Tag,
  Table,
  Radio,
  Checkbox,
  Modal,
  Tooltip,
} from "antd";
import axios from "axios";

/* =========================
   Types
========================= */
interface LatestInterface {
  ip: string;
  dns: string;
  port: string;
  type: string;
}

interface TriggerItem {
  key: string;
  triggerid: string;
  timestamp: string;
  time_from?: number;
  time_till?: number;
  hostname: string;
  hostid?: string;
  description: string;
  comments?: string;
  priority: string;
  status: string;
  depends_on?: string;
  tags?: Array<{ tag: string; value: string }>;
  recovery_time?: string;
  acknowledgement?: string;
}

const HostFilterCard = () => {
  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  const [hostGroups, setHostGroups] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [tableData, setTableData] = useState<TriggerItem[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  /* ✅ Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* =========================
     Keyboard Pagination
     Alt + N / Alt + P
  ========================= */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⛔ Ignore typing
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const totalPages = Math.ceil(tableData.length / pageSize);

      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCurrentPage((p) => (p < totalPages ? p + 1 : p));
      }

      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCurrentPage((p) => (p > 1 ? p - 1 : p));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tableData.length, pageSize]);

  /* =========================
     Load Host Groups
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
        {
          headers: {
            Authorization: `Bearer ${user_token}`,
          },
        }
      )
      .then((r) => setHostGroups(r.data.result ?? []));
  }, []);

  /* =========================
     Load Hosts
  ========================= */
  useEffect(() => {
    if (!selectedGroups.length) {
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
            groupids: selectedGroups,
          },
          id: 2,
        },
        {
          headers: {
            Authorization: `Bearer ${user_token}`,
          },
        }
      )
      .then((r) => setHosts(r.data.result ?? []));
  }, [selectedGroups]);

  /* =========================
     Apply Filters
  ========================= */
  const handleApplyFilters = async () => {
    setLoadingTable(true);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "problem.get",
          params: {
            output: ["eventid", "objectid", "clock", "name", "severity"],
            groupids: selectedGroups,
            hostids: selectedHosts,
            recent: true,
            sortfield: ["eventid"],
            sortorder: "DESC",
          },
          id: 3,
        },
        {
          headers: {
            Authorization: `Bearer ${user_token}`,
          },
        }
      );

      const problems = r.data.result ?? [];

      const formatted = problems.map((p: any) => ({
        key: p.eventid,
        triggerid: p.objectid,
        timestamp: new Date(p.clock * 1000).toLocaleString(),
        time_from: p.clock,
        hostname: p.hosts?.[0]?.name ?? "Unknown",
        description: p.name,
        priority: p.severity,
        status: "0",
      }));

      setTableData(formatted);
      setCurrentPage(1);
    } finally {
      setLoadingTable(false);
    }
  };

  /* =========================
     Helpers
  ========================= */
  const getSeverityTag = (priority: string) => {
    const p = Number(priority);
    const colors = ["#aaa", "#1890ff", "#fa8c16", "#faad14", "#f5222d", "#722ed1"];
    return <Tag color={colors[p] || "#aaa"}>{priority}</Tag>;
  };

  const columns = [
    { title: "Time", dataIndex: "timestamp", width: 160 },
    {
      title: "Severity",
      dataIndex: "priority",
      width: 100,
      render: (p: string) => getSeverityTag(p),
    },
    { title: "Host", dataIndex: "hostname", width: 180 },
    { title: "Problem", dataIndex: "description" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <span>
            Problems
            <span style={{ marginLeft: 12, color: "#999", fontSize: 12 }}>
              (Alt + N / Alt + P)
            </span>
          </span>
        }
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              mode="multiple"
              placeholder="Host Groups"
              style={{ width: "100%" }}
              options={hostGroups.map((g) => ({
                value: g.groupid,
                label: g.name,
              }))}
              onChange={setSelectedGroups}
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
              onChange={setSelectedHosts}
            />
          </Col>

          <Col span={4}>
            <Button type="primary" onClick={handleApplyFilters}>
              Apply
            </Button>
          </Col>
        </Row>

        <Table
          rowKey="key"
          columns={columns}
          dataSource={tableData}
          loading={loadingTable}
          pagination={{
            current: currentPage,
            pageSize,
            total: tableData.length,
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
};

export default HostFilterCard;
