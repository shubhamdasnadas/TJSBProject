"use client";

import axios from "axios";
import { Table, Tag, Typography } from "antd";
import { useEffect, useState } from "react";

type HostRow = {
  key: string;
  hostid: string;
  hostname: string;
  operationalText: string;
  operationalValue: number;
  primaryText: string;
  primaryValue: number;
  secondaryText: string;
  secondaryValue: number;
};

const ZABBIX_URL =
  "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";

const AUTH_TOKEN =
  "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

function renderStatus(value: number, text: string) {
  return (
    <Tag
      color={value === 1 ? "green" : "red"}
      style={{ width: "100%", textAlign: "center" }}
    >
      {text}
    </Tag>
  );
}

const columns = [
  {
    title: "Hostname",
    dataIndex: "hostname",
    key: "hostname",
    ellipsis: true,
  },
  {
    title: "Primary Link",
    dataIndex: "primaryValue",
    key: "primary",
    width: 180,
    render: (_: unknown, record: HostRow) =>
      renderStatus(record.primaryValue, record.primaryText),
  },
  {
    title: "Secondary Link",
    dataIndex: "secondaryValue",
    key: "secondary",
    width: 180,
    render: (_: unknown, record: HostRow) =>
      renderStatus(record.secondaryValue, record.secondaryText),
  },
];

async function fetchHosts(): Promise<HostRow[]> {
  const res = await axios.post(
    ZABBIX_URL,
    {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "host", "status"],
      },
      id: 1,
    },
    {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
    }
  );

  return res.data.result
    .map((host: any) => {
      const statusValue = host.status === "0" ? 1 : 0;
      const statusText = statusValue === 1 ? "up (1.00)" : "down (0.00)";

      // Using host.status for all three columns until specific link metrics are available
      return {
        key: host.hostid,
        hostid: host.hostid,
        hostname: host.host,
        primaryValue: statusValue,
        primaryText: statusText,
        secondaryValue: statusValue,
        secondaryText: statusText,
      };
    })
    .sort((a: HostRow, b: HostRow) => {
      // Down (0) first, then Up (1); then alphabetical by hostname
      if (a.primaryValue !== b.primaryValue) return a.primaryValue - b.primaryValue;
      return a.hostname.localeCompare(b.hostname);
    });
}

export default function AvailabilityDataPage() {
  const [data, setData] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchHosts()
      .then(setData)
      .catch((err) => {
        console.error("Failed to fetch hosts:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "1.5rem" }}>
      <Typography.Title level={4}>Availability Data</Typography.Title>
      <Table
        rowKey="key"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: true }}
        size="small"
        style={{ marginTop: "16px" }}
      />
    </div>
  );
}