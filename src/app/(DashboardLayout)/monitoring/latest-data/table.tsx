"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal } from "antd";
import type { ColumnsType } from "antd/es/table";
import RangePickerDemo from "../../RangePickerDemo";

/* =========================
   HELPERS
========================= */
const toUnix = (d: string, t: string) =>
  Math.floor(new Date(`${d} ${t}`).getTime() / 1000);

/* =========================
   TYPES
========================= */
type RowType = {
  key: string;
  itemid: string;
  host: string;
  name: string;
  lastCheck: string;
  lastValue: string | number;
  change: string;
};

interface LatestDataTableProps {
  data?: RowType[];
  loading?: boolean;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/* =========================
   COMPONENT
========================= */
export default function LatestDataTable({
  data = [],
  loading = false,
  currentPage,
  pageSize,
  onPageChange,
}: LatestDataTableProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [currentRow, setCurrentRow] = useState<RowType | null>(null);
  const [range, setRange] = useState({
    start: Math.floor(Date.now() / 1000) - 3600,
    end: Math.floor(Date.now() / 1000),
  });

  /* =========================
     LOAD HISTORY
  ========================= */
  const loadHistory = async (row: RowType) => {
    setCurrentRow(row);
    setOpen(true);

    const token = localStorage.getItem("zabbix_auth");

    const res = await fetch("/api/zabbix-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "history.get",
        params: {
          output: "extend",
          history: 0,
          itemids: [row.itemid],
          time_from: range.start,
          time_till: range.end,
          sortfield: "clock",
          sortorder: "DESC",
        },
        id: 1,
      }),
    });

    const json = await res.json();
    setRows(json.result ?? []);
  };

  /* =========================
     RELOAD ON TIME CHANGE
  ========================= */
  useEffect(() => {
    if (open && currentRow) {
      loadHistory(currentRow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  /* =========================
     TABLE COLUMNS
  ========================= */
  const columns: ColumnsType<RowType> = useMemo(
    () => [
      { title: "Host", dataIndex: "host", width: 160 },
      { title: "Name", dataIndex: "name", width: 220 },
      { title: "Last check", dataIndex: "lastCheck", width: 180 },
      { title: "Last value", dataIndex: "lastValue", width: 140 },
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
    <>
      {/* =========================
          MAIN TABLE
      ========================= */}
      <Table<RowType>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="key"
        size="middle"
        // pagination={{
        //   current: currentPage,
        //   pageSize: pageSize,
        //   onChange: onPageChange,
        //   showSizeChanger: false,
        // }}
      />

      {/* =========================
          HISTORY MODAL
      ========================= */}
      <Modal
        title={
          currentRow
            ? `${currentRow.host} – ${currentRow.name}`
            : "History"
        }
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={650}
      >
        {/* TIME RANGE PICKER */}
        <div style={{ marginBottom: 12 }}>
          <RangePickerDemo
            onRangeChange={({ startDate, startTime, endDate, endTime }) =>
              setRange({
                start: toUnix(startDate, startTime),
                end: toUnix(endDate, endTime),
              })
            }
          />
        </div>

        {/* HISTORY TABLE */}
        {rows.length === 0 ? (
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
    </>
  );
}
