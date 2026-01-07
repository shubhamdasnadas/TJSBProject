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

/** SVG → PNG for jsPDF */
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

  /* PAGE 1 – COVER */
  const logoPng = await loadSvgAsPng(TECHSEC_LOGO);

  doc.addImage(logoPng, "PNG", pageWidth / 2 - 150, 80, 300, 170);



  doc.setFontSize(26);
  doc.text("Techsec NMS – History Report", pageWidth / 2, 410, { align: "center",  });

  doc.text(
    `Generated: ${new Date().toLocaleString()}`,     pageWidth / 2,      440,     { align: "center" }   );
    
  doc.setFontSize(16);
  doc.text(`Metric: ${title}`, pageWidth / 2, 470, { align: "center" });
  

  doc.setFontSize(12);
  doc.setTextColor(90);

  /* PAGE 2 – CHART */
  if (chartEl) {
    const canvas = await html2canvas(chartEl, {
      scale: 3,
      backgroundColor: "#ffffff",
    });

    doc.addPage();
    doc.setFontSize(18);
    doc.text("Utilization Graph", 40, 40);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 40, 60, 760, 320);
  }

  /* PAGE 3 – TABLE */
  doc.addPage();
  doc.setFontSize(18);
  doc.text("History Data", 40, 40);

  autoTable(doc, {
    startY: 70,
    head: [["Time", "Value"]],
    body: data.map((r) => [
      new Date(r.clock * 1000).toLocaleString(),
      Number(r.value).toFixed(2),
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 30, 30] },
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
    } finally {
      setLoadingTable(false);
    }
  };

  const openHistory = async (itemid: string, name: string, host: string) => {
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
        `${historyDateRange.startDate} ${historyDateRange.startTime || "00:00:00"}`
      ).getTime() / 1000;

    const end =
      new Date(
        `${historyDateRange.endDate} ${historyDateRange.endTime || "23:59:59"}`
      ).getTime() / 1000;

    return historyData.filter(
      (r: any) => r.clock >= start && r.clock <= end
    );
  };

  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 180 },
    { title: "Item", dataIndex: "name", width: 300 },
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
            listHeight={600}
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
            listHeight={600}
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

        <Table columns={columns} dataSource={tableData} loading={loadingTable} />

        <Modal
          title={`${historyHost} – ${historyTitle}`}
          open={historyOpen}
          onCancel={() => setHistoryOpen(false)}
          footer={null}
          width={900}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space style={{ justifyContent: "space-between", width: "100%" }}>
              <RangePickerDemo onRangeChange={setHistoryDateRange} />
              <Button
                type="primary"
                onClick={() =>
                  exportHistoryToPDF(
                    historyTitle,
                    filterHistory(),
                    chartRef.current
                  )
                }
              >
                Export PDF
              </Button>
            </Space>

            <div ref={chartRef} style={{ background: "#fff", padding: 12 }}>
              <HistoryLineChart
                data={filterHistory().map((r: any) => ({
                  clock: r.clock,
                  value: r.value,
                }))}
              />
            </div>

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
