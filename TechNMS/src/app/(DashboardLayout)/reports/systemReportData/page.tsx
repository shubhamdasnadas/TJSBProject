"use client";

import React, { useEffect, useState } from "react";
import { Table, Form } from "antd";
import axios from "axios";
import useZabbixData from "../../widget/three";
import branches from "../../availability/data/data";

/* ===================== CONSTANTS ===================== */

const ITEMS = [
  // 'Interface ["GigabitEthernet0/0/0"]: Bits sent',
  // 'Interface ["GigabitEthernet0/0/0"]: Bits received',
  // 'Interface ["GigabitEthernet0/0/0"]: Speed',
  "Memory utilization",
  "CPU utilization",
];

const COLUMN_HEADER_MAP: Record<string, string> = {
  // 'Interface ["GigabitEthernet0/0/0"]: Bits sent': "Bits Sent (Avg)",
  // 'Interface ["GigabitEthernet0/0/0"]: Bits received': "Bits Received (Avg)",
  // 'Interface ["GigabitEthernet0/0/0"]: Speed': "Speed (Avg)",
  "Memory utilization": "Memory Usage (Avg)",
  "CPU utilization": "CPU Usage (Avg)",
};

/* ===================== COMPONENT ===================== */

const SystemReportData: React.FC = () => {
  const { hosts } = useZabbixData();
  const user_token = localStorage.getItem("zabbix_auth");
  const [rows, setRows] = useState<any[]>([]);

  const findBranch = (hostName?: string) => {
    if (!hostName) return "-";
    const match =
      branches.find(
        (b: any) =>
          hostName.includes(b.code) ||
          hostName.toLowerCase() === b.name.toLowerCase()
      ) ?? null;
    return match ? match.name : "-";
  };

  useEffect(() => {
    const fetchData = async () => {
      const res = await axios.post(
        "/api/api_system_report_data/get_history_data",
        { auth: user_token, groupids: ["210"] }
      );

      const data = res.data?.result ?? [];

      setRows(
        data.map((row: any) => ({
          key: row.hostname,
          host: row.hostname,
          branch: findBranch(row.hostname),
          ...row,
        }))
      );
    };

    if (user_token) fetchData();
  }, [user_token, hosts]);

  const columns = [
    { title: "Host", dataIndex: "host" },
    { title: "Branch", dataIndex: "branch" },
    ...ITEMS.map((item) => ({
      title: COLUMN_HEADER_MAP[item],
      align: "center" as const,
      render: (_: any, row: any) =>
        row[item]
          ? `${row[item].value} ${row[item].unit}`
          : "-",
    })),
  ];

  return (
    <Form layout="vertical">
      <h2>System Report – 15 Days Average</h2>
      <Table
        pagination={false}
        dataSource={rows}
        columns={columns}
      />
    </Form>
  );
};

export default SystemReportData;
