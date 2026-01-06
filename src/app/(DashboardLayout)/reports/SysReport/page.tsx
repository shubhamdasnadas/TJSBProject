"use client";

import { useEffect, useState } from "react";
import { Select, Button, Table, Space, Modal, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import RangePickerDemo from "../../RangePickerDemo";
import { Card } from "@mui/material";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* =========================
   TYPES
========================= */
type HostGroup = { groupid: string; name: string };
type Host = { hostid: string; name: string };

type TableRow = {
  key: string;
  itemid: string;
  host: string;
  name: string;
  lastValue: string;
  lastCheck: string;
  change: string;
};

type DateRange = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

/* =========================
   AXIOS CONFIG
========================= */
const axiosCfg = {
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer f367bb14b4c8d2cc37da595aabc75950",
  },
};

/* =========================
   PDF EXPORT
========================= */
const exportHistoryToPDF = (title: string, data: any[]) => {
  const doc = new jsPDF("l", "pt", "a4");
  doc.setFontSize(18);
  doc.text(`History Report - ${title}`, 40, 40);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 55);

  autoTable(doc, {
    startY: 70,
    head: [["Time", "Value"]],
    body: data.map((r) => [
      new Date(r.clock * 1000).toLocaleString(),
      Number(r.value).toFixed(2),
    ]),
    styles: { fontSize: 8 },
  });

  doc.save(`history_${Date.now()}.pdf`);
};

/* =========================
   HISTORY CHART
========================= */
const HistoryLineChart = ({
  data,
}: {
  data: { clock: number; value: number }[];
}) => {
  if (!data.length) return null;

  const chartData = [...data].reverse().map((d) => ({
    time: new Date(d.clock * 1000).toLocaleTimeString(),
    value: Number(d.value),
  }));

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis dataKey="time" minTickGap={30} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/* =========================
   PAGE
========================= */
export default function LatestDataPage() {
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyHost, setHistoryHost] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyDateRange, setHistoryDateRange] = useState<DateRange>({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  /* =========================
     KEYBOARD SHORTCUTS
  ========================= */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === "n" || e.key === "N") {
          e.preventDefault();
          const maxPages = Math.ceil(tableData.length / pageSize);
          if (currentPage < maxPages) {
            setCurrentPage(currentPage + 1);
          }
        }
        if (e.key === "p" || e.key === "P") {
          e.preventDefault();
          if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, tableData.length, pageSize]);

  /* =========================
     LOADERS
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
      .then((r) => setHostGroups(r.data.result ?? []));
  }, []);

  const loadHosts = async (groups: string[]) => {
    if (!groups.length) return setHosts([]);
    const r = await axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "host.get",
        params: { output: ["hostid", "name"], groupids: groups },
        id: 2,
      },
      axiosCfg
    );
    setHosts(r.data.result ?? []);
  };

  const handleApply = async () => {
    if (!selectedHosts.length) return message.warning("Select host");
    setLoadingTable(true);

    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "item.get",
          params: {
            output: ["itemid", "name", "lastvalue", "lastclock", "delta"],
            selectHosts: ["name"],
            hostids: selectedHosts,
          },
          id: 3,
        },
        axiosCfg
      );

      setTableData(
        r.data.result.map((i: any) => ({
          key: i.itemid,
          itemid: i.itemid,
          host: i.hosts?.[0]?.name ?? "-",
          name: i.name,
          lastValue: i.lastvalue,
          lastCheck: new Date(i.lastclock * 1000).toLocaleString(),
          change: i.delta ?? "-",
        }))
      );
    } finally {
      setLoadingTable(false);
    }
  };

  const openHistory = async (
    itemid: string,
    name: string,
    host: string
  ) => {
    setHistoryTitle(name);
    setHistoryHost(host);
    setHistoryOpen(true);
    setHistoryLoading(true);

    const r = await axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "history.get",
        params: {
          output: "extend",
          history: 0,
          itemids: [itemid],
          sortfield: "clock",
          sortorder: "DESC",
          limit: 1000,
        },
        id: 10,
      },
      axiosCfg
    );

    setHistoryData(r.data.result ?? []);
    setHistoryLoading(false);
  };

  const filterHistory = () => {
    if (!historyDateRange.startDate) return historyData;

    const start =
      new Date(
        `${historyDateRange.startDate} ${
          historyDateRange.startTime || "00:00:00"
        }`
      ).getTime() / 1000;

    const end =
      new Date(
        `${historyDateRange.endDate} ${
          historyDateRange.endTime || "23:59:59"
        }`
      ).getTime() / 1000;

    return historyData.filter(
      (r: any) => r.clock >= start && r.clock <= end
    );
  };

  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 160 },
    { title: "Item", dataIndex: "name", width: 280 },
    { title: "Last Value", dataIndex: "lastValue", width: 120 },
    { title: "Last Check", dataIndex: "lastCheck", width: 180 },
    { title: "Change", dataIndex: "change", width: 100 },
    {
      title: "History",
      render: (_, r) => (
        <Button size="small" onClick={() => openHistory(r.itemid, r.name, r.host)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <Card style={{ padding: 35 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space>
          <Select
            mode="multiple"
            placeholder="Host Groups"
            style={{ width: 260 }}
            listHeight={800} // Expanded height

            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              !!option &&
              option.label.toLowerCase().includes(input.toLowerCase())
            }
            options={hostGroups.map((g) => ({
              label: g.name,
              value: g.groupid,
            }))}
            onChange={(g) => {
              setSelectedGroups(g);
              setSelectedHosts([]);
              loadHosts(g);
            }}
          />

          <Select
            mode="multiple"
            placeholder="Hosts"
            style={{ width: 260 }}
            listHeight={800} // Expanded height

            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              !!option &&
              option.label.toLowerCase().includes(input.toLowerCase())
            }
            options={hosts.map((h) => ({
              label: h.name,
              value: h.hostid,
            }))}
            onChange={setSelectedHosts}
          />

          <Button type="primary" onClick={handleApply}>
            Apply
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={tableData}
          loading={loadingTable}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: tableData.length,
            onChange: (page) => setCurrentPage(page),
            onShowSizeChange: (_, size) => setPageSize(size),
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} items | Alt+N: Next | Alt+P: Previous`,
          }}
        />

        <Modal
          title={`${historyHost} – ${historyTitle}`}
          open={historyOpen}
          onCancel={() => setHistoryOpen(false)}
          footer={null}
          width={800}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space style={{ justifyContent: "space-between", width: "100%" }}>
              <RangePickerDemo onRangeChange={setHistoryDateRange} />
              <Button
                type="primary"
                onClick={() =>
                  exportHistoryToPDF(historyTitle, filterHistory())
                }
              >
                Export PDF
              </Button>
            </Space>

            <HistoryLineChart
              data={filterHistory().map((r: any) => ({
                clock: r.clock,
                value: r.value,
              }))}
            />

            <Table
              size="small"
              pagination={false}
              loading={historyLoading}
              columns={[
                {
                  title: "Time",
                  dataIndex: "clock",
                  render: (v) => new Date(v * 1000).toLocaleString(),
                },
                {
                  title: "Value",
                  dataIndex: "value",
                  render: (v) => Number(v).toFixed(2),
                },
              ]}
              dataSource={filterHistory().map((r: any) => ({
                key: r.clock,
                clock: r.clock,
                value: r.value,
              }))}
            />
          </Space>
        </Modal>
      </Space>
    </Card>
  );
}
