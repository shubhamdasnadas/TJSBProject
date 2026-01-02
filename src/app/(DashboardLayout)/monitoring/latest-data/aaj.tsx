"use client";

import React, { useMemo, useState } from "react";
import { Table, Button, Space, Modal } from "antd";
import type { ColumnsType } from "antd/es/table";

type RowType = {
  key: string;
  itemid: string;        // 🔑 REQUIRED
  host: string;
  name: string;
  lastCheck: string;
  lastValue: string | number;
  change: string;
  tags: string;
  info: string;
};

interface LatestDataTableProps {
  data?: RowType[];
  loading?: boolean;
}

export default function LatestDataTable({
  data = [],
  loading = false,
}: LatestDataTableProps) {
  /* =========================
     HISTORY STATE
  ========================= */
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  /* =========================
     LOAD HISTORY (NUMERIC)
  ========================= */
  const loadHistory = async (row: RowType) => {
    setTitle(`${row.host} – ${row.name}`);
    setOpen(true);
    setRows([]);
    setLoadingHistory(true);

    try {
      const res = await fetch("/api/zabbix-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "history.get",
          params: {
            output: "extend",
            history: 0,              // ✅ NUMERIC (CPU usage)
            itemids: [row.itemid],   // ✅ MUST be array
            sortfield: "clock",
            sortorder: "DESC",
            limit: 10,
          },
          auth: localStorage.getItem("zabbix_auth"),
          id: 1,
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error.data);

      setRows(json.result ?? []);
    } catch (err) {
      console.error("history.get failed", err);
      setRows([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  /* =========================
     TABLE COLUMNS
  ========================= */
  const columns: ColumnsType<RowType> = useMemo(
    () => [
      { title: "Host", dataIndex: "host", width: 140 },
      { title: "Name", dataIndex: "name", width: 220 },
      { title: "Last check", dataIndex: "lastCheck", width: 160 },
      { title: "Last value", dataIndex: "lastValue", width: 120 },
      { title: "Change", dataIndex: "change", width: 100 },
      {
        title: "View",
        width: 90,
        render: (_, row) => (
          <Button size="small" onClick={() => loadHistory(row)}>
            View
          </Button>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <Table<RowType>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="key"
        size="small"
        bordered
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50", "100"],
        }}
      />

      {/* =========================
          HISTORY MODAL (TIME + VALUE ONLY)
      ========================= */}
      <Modal
        title={title}
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="close" onClick={() => setOpen(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {loadingHistory ? (
          <div>Loading…</div>
        ) : rows.length === 0 ? (
          <div>No history found</div>
        ) : (
          <table width="100%" border={1} cellPadding={6}>
            <thead>
              <tr>
                <th style={{ width: 220 }}>Time</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    {new Date(Number(r.clock) * 1000).toLocaleString()}
                  </td>
                  <td>{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
