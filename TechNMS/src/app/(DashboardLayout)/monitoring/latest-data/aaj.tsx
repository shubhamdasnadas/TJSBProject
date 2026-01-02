 "use client";

import React, { useMemo } from "react";
import { Table, Button, Space } from "antd";
import type { ColumnsType } from "antd/es/table";

type RowType = {
  key: string;
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

export default function LatestDataTable({ data = [], loading = false }: LatestDataTableProps) {
  const columns: ColumnsType<RowType> = useMemo(
    () => [
      {
        title: "Host",
        dataIndex: "host",
        key: "host",
        width: 120,
        sorter: (a, b) => String(a.host || "").localeCompare(String(b.host || "")),
      },
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        width: 150,
        sorter: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
      },
      {
        title: "Last check",
        dataIndex: "lastCheck",
        key: "lastCheck",
        width: 140,
      },
      {
        title: "Last value",
        dataIndex: "lastValue",
        key: "lastValue",
        width: 120,
        sorter: (a, b) => Number(a.lastValue ?? 0) - Number(b.lastValue ?? 0),
      },
      {
        title: "Change",
        dataIndex: "change",
        key: "change",
        width: 100,
      },
      {
        title: "Tags",
        dataIndex: "tags",
        key: "tags",
        width: 150,
      },
      {
        title: "Info",
        dataIndex: "info",
        key: "info",
      },
    ],
    []
  );

  const exportCSV = () => {
    if (!data.length) return;

    const headers = Object.keys(data[0]).join(",");
    const rows = data
      .map((row) =>
        Object.values(row)
          .map((v) => String(v).replace(/\n/g, " "))
          .join(",")
      )
      .join("\n");

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "latest_data.csv";
    a.click();

    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button onClick={exportCSV} disabled={!data.length}>
          Export CSV
        </Button>
      </Space>

      <Table<RowType>
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={data.length > 0 ? {
          pageSize: 50,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100', '200'],
          showTotal: (total, range) => `Displaying ${range[0]} to ${range[1]} of ${total}${total >= 1000 ? '+ found' : ''}`,
        } : false}
        rowKey="key"
        size="small"
        bordered
        locale={{ emptyText: data.length === 0 ? "Apply filter to view results" : "No data" }}
      />
    </div>
  );
}