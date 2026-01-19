"use client";

import React, { useEffect, useState } from "react";
import { Table, Card, Spin, Alert, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import axios from "axios";

const ZABBIX_URL = "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";
const TOKEN = "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";
const HOST_ID = "11179";

interface Row {
  key: string;
  host: string;
  branch: string;
  primaryBitsReceived: string;
  primaryBitsSent: string;
  averageSpeed: string;
  memoryUtilization: string;
  cpuUtilization: string;
}

export default function ZabbixMonitoringDashboard() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

const callZabbix = async (method: string, params: any) => {
  const res = await axios.post(
    ZABBIX_URL,
    {
      jsonrpc: "2.0",
      method,
      params,
      id: Math.random(),
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    }
  );

  if (res.data.error) {
    throw new Error(res.data.error.message);
  }

  return res.data.result;
};

  const fetchLatestValue = async (item: any) => {
    const historyType = item.value_type === "3" ? 3 : 0;

    const history = await callZabbix("history.get", {
      output: "extend",
      history: historyType,
      itemids: [item.itemid],
      sortfield: "clock",
      sortorder: "DESC",
      limit: 10,
    });

    if (!history?.length) return "N/A";

    const avg =
      history.reduce((s: number, h: any) => s + parseFloat(h.value), 0) /
      history.length;

    return avg.toFixed(2) + (item.units ? ` ${item.units}` : "");
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      /** HOST */
      const [host] = await callZabbix("host.get", {
        output: ["hostid", "name"],
        selectInventory: ["site_address_a"],
        hostids: [HOST_ID],
      });

      /** ITEMS */
      const items = await callZabbix("item.get", {
        output: ["itemid", "name", "key_", "units", "value_type"],
        hostids: [HOST_ID],
        monitored: true,
      });

      const row: Row = {
        key: host.hostid,
        host: host.name,
        branch: host.inventory?.site_address_a || "-",
        primaryBitsReceived: "N/A",
        primaryBitsSent: "N/A",
        averageSpeed: "N/A",
        memoryUtilization: "N/A",
        cpuUtilization: "N/A",
      };

      for (const item of items) {
        const name = item.name.toLowerCase();
        const key = item.key_.toLowerCase();
        const value = await fetchLatestValue(item);

        if (name.includes("in") || key.includes("in")) {
          row.primaryBitsReceived = value;
        } else if (name.includes("out") || key.includes("out")) {
          row.primaryBitsSent = value;
        } else if (name.includes("speed")) {
          row.averageSpeed = value;
        } else if (name.includes("memory")) {
          row.memoryUtilization = value;
        } else if (name.includes("cpu")) {
          row.cpuUtilization = value;
        }
      }

      setData([row]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const i = setInterval(loadData, 30000);
    return () => clearInterval(i);
  }, []);

  const columns = [
    { title: "Host", dataIndex: "host" },
    { title: "Branch", dataIndex: "branch" },
    { title: "Primary Bits Received", dataIndex: "primaryBitsReceived" },
    { title: "Primary Bits Sent", dataIndex: "primaryBitsSent" },
    { title: "Average Speed", dataIndex: "averageSpeed" },
    { title: "Memory Utilization", dataIndex: "memoryUtilization" },
    { title: "CPU Utilization", dataIndex: "cpuUtilization" },
  ];

  return (
    <Card
      title="Zabbix Monitoring Dashboard"
      extra={
        <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
          Refresh
        </Button>
      }
    >
      {error && <Alert type="error" message={error} />}
      {loading ? (
        <Spin />
      ) : (
        <Table columns={columns} dataSource={data} pagination={false} />
      )}
    </Card>
  );
}
