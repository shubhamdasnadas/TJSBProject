"use client";

import { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";

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
const TECHSEC_LOGO = "/images/logos/techsec-logo_name.svg";

const loadSvgAsPng = async (url: string) => {
  const svgText = await fetch(url).then((r) => r.text());
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width * 3;
      canvas.height = img.height * 3;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = svgUrl;
  });
};

const exportHistoryToPDF = async (
  title: string,
  data: any[],
  chartEl: HTMLDivElement | null
) => {
  const doc = new jsPDF("l", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  const logoPng = await loadSvgAsPng(TECHSEC_LOGO);
  doc.addImage(logoPng, "PNG", pageWidth / 2 - 150, 80, 300, 170);

  doc.setFontSize(26);
  doc.text("Techsec NMS – History Report", pageWidth / 2, 410, {
    align: "center",
  });

  doc.setFontSize(14);
  doc.text(`Metric: ${title}`, pageWidth / 2, 450, { align: "center" });

  if (chartEl) {
    const canvas = await html2canvas(chartEl, { scale: 3 });
    doc.addPage();
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 40, 60, 760, 320);
  }

  doc.addPage();
  autoTable(doc, {
    head: [["Time", "Value"]],
    body: data.map((r) => [
      new Date(r.clock * 1000).toLocaleString(),
      Number(r.value).toFixed(2),
    ]),
  });

  doc.save(`techsec_history_${Date.now()}.pdf`);
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
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line dataKey="value" strokeWidth={2} dot={false} />
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

  /* ✅ PAGINATION STATE */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  const chartRef = useRef<HTMLDivElement>(null);

  /* ✅ KEYBOARD PAGINATION */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tableData.length]);

  /* LOAD HOST GROUPS */
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

      setCurrentPage(1); // ✅ reset page
    } finally {
      setLoadingTable(false);
    }
  };

  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 180 },
    { title: "Item", dataIndex: "name", width: 300 },
    { title: "Last Value", dataIndex: "lastValue", width: 120 },
    { title: "Last Check", dataIndex: "lastCheck", width: 180 },
    { title: "Change", dataIndex: "change", width: 100 },
  ];

  return (
    <Card style={{ padding: 35 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space>
          <Select
            mode="multiple"
            placeholder="Host Groups"
            style={{ width: 260 }}
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
            pageSize,
            total: tableData.length,
            onChange: setCurrentPage,
            showSizeChanger: false,
          }}
          title={() => (
            <span>
              Latest Data
              <span style={{ marginLeft: 12, color: "#999", fontSize: 12 }}>
                (Alt + N / Alt + P)
              </span>
            </span>
          )}
        />
      </Space>
    </Card>
  );
}
