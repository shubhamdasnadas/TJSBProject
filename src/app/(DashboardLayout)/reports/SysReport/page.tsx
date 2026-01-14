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
  CartesianGrid,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";

/* =========================
   TYPES
========================= */
type HostGroup = { groupid: string; name: string };
type Host = { hostid: string; name: string };
type Item = { itemid: string; name: string; units: string };
type Trigger = { triggerid: string; description: string; priority: number; lastchange: number };

type TableRow = {
  key: string;
  itemid: string;
  host: string;
  name: string;
  lastValue: string;
  lastCheck: string;
  change: string;
};

type TriggerRow = {
  key: string;
  triggerid: string;
  description: string;
  priority: number;
  severity: string;
  lastchange: string;
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
   PDF EXPORT WITH WATERMARK
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

const addWatermark = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(60);
    doc.text("TECHSEC NMS", doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() / 2, {
      align: "center",
      angle: 45,
      opacity: 0.1,
    });
  }
};

const exportHistoryToPDF = async (
  title: string,
  historyData: any[],
  triggerData: TriggerRow[],
  chartEl: HTMLDivElement | null,
  host: string
) => {
  const doc = new jsPDF("l", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();

  /* PAGE 1 – COVER */
  const logoPng = await loadSvgAsPng(TECHSEC_LOGO);
  doc.addImage(logoPng, "PNG", pageWidth / 2 - 150, 80, 300, 170);

  doc.setFontSize(26);
  doc.text("Techsec NMS – History Report", pageWidth / 2, 410, { align: "center" });

  doc.text(
    `Generated: ${new Date().toLocaleString()}`,
    pageWidth / 2,
    440,
    { align: "center" }
  );

  doc.setFontSize(16);
  doc.text(`Metric: ${title}`, pageWidth / 2, 470, { align: "center" });
  doc.text(`Host: ${host}`, pageWidth / 2, 500, { align: "center" });

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

  /* PAGE 3 – HISTORY DATA TABLE */
  doc.addPage();
  doc.setFontSize(18);
  doc.text("History Data", 40, 40);

  autoTable(doc, {
    startY: 70,
    head: [["Time", "Value"]],
    body: historyData.map((r) => [
      new Date(r.clock * 1000).toLocaleString(),
      Number(r.value).toFixed(2),
    ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  /* PAGE 4 – TRIGGERS TABLE */
  if (triggerData.length) {
    doc.addPage();
    doc.setFontSize(18);
    doc.text("Associated Triggers", 40, 40);

    autoTable(doc, {
      startY: 70,
      head: [["Trigger", "Severity", "Last Change"]],
      body: triggerData.map((t) => [t.description, t.severity, t.lastchange]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 30, 30] },
    });
  }

  addWatermark(doc);
  doc.save(`techsec_history_${Date.now()}.pdf`);
};

/* =========================
   HISTORY CHART WITH TRIGGERS
========================= */
const HistoryLineChart = ({
  data,
  triggers,
}: {
  data: { clock: number; value: number }[];
  triggers: { time: number; description: string }[];
}) => {
  if (!data.length) return null;

  const chartData = [...data].reverse().map((d) => ({
    time: new Date(d.clock * 1000).toLocaleTimeString(),
    value: Number(d.value),
    timestamp: d.clock * 1000,
  }));

  return (
    <div style={{ height: 400 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" minTickGap={30} />
          <YAxis />
          <Tooltip
            contentStyle={{ backgroundColor: "#333", border: "1px solid #666" }}
            formatter={(value: any) => Number(value).toFixed(2)}
          />
          <Line type="monotone" dataKey="value" stroke="#1890ff" strokeWidth={2} dot={false} />
          
          {/* Red dots for triggers */}
          {triggers.map((trigger, idx) => {
            const closestPoint = chartData.reduce((prev, curr) =>
              Math.abs(curr.timestamp - trigger.time) < Math.abs(prev.timestamp - trigger.time)
                ? curr
                : prev
            );
            return (
              <ReferenceDot
                key={idx}
                x={closestPoint.time}
                y={closestPoint.value}
                r={6}
                fill="#ff4d4f"
                stroke="#d9363e"
                strokeWidth={2}
              />
            );
          })}
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
  const [items, setItems] = useState<Item[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>("");
  
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyHost, setHistoryHost] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [triggerRows, setTriggerRows] = useState<TriggerRow[]>([]);
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
      .then((r) => setHostGroups(r.data.result ?? []))
      .catch((e) => console.error("Failed to load host groups:", e));
  }, []);

  const loadHosts = async (groups: string[]) => {
    if (!groups.length) return setHosts([]);
    try {
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
    } catch (e) {
      console.error("Failed to load hosts:", e);
      message.error("Failed to load hosts");
    }
  };

  const loadItems = async (hostids: string[]) => {
    if (!hostids.length) return setItems([]);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "item.get",
          params: {
            output: ["itemid", "name", "units"],
            hostids,
          },
          id: 3,
        },
        axiosCfg
      );
      setItems(r.data.result ?? []);
    } catch (e) {
      console.error("Failed to load items:", e);
      message.error("Failed to load items");
    }
  };

  const loadTriggers = async (itemid: string) => {
    if (!itemid) return setTriggers([]);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "trigger.get",
          params: {
            output: ["triggerid", "description", "priority", "lastchange"],
            itemids: itemid,
          },
          id: 4,
        },
        axiosCfg
      );
      setTriggers(r.data.result ?? []);
    } catch (e) {
      console.error("Failed to load triggers:", e);
    }
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
          id: 5,
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
    } catch (e) {
      console.error("Failed to load items:", e);
      message.error("Failed to load items");
    } finally {
      setLoadingTable(false);
    }
  };

  const openHistory = async (itemid: string, name: string, host: string) => {
    setHistoryTitle(name);
    setHistoryHost(host);
    setHistoryOpen(true);
    setHistoryLoading(true);

    try {
      const [historyRes, triggersRes] = await Promise.all([
        axios.post(
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
            id: 6,
          },
          axiosCfg
        ),
        axios.post(
          "/api/zabbix-proxy",
          {
            jsonrpc: "2.0",
            method: "trigger.get",
            params: {
              output: ["triggerid", "description", "priority", "lastchange"],
              itemids: [itemid],
            },
            id: 7,
          },
          axiosCfg
        ),
      ]);

      setHistoryData(historyRes.data.result ?? []);
      
      const triggerList: TriggerRow[] = (triggersRes.data.result ?? []).map((t: any) => ({
        key: t.triggerid,
        triggerid: t.triggerid,
        description: t.description,
        priority: t.priority,
        severity: ["Info", "Warning", "Average", "High", "Disaster"][t.priority] || "Info",
        lastchange: new Date(t.lastchange * 1000).toLocaleString(),
      }));
      setTriggerRows(triggerList);
    } catch (e) {
      console.error("Failed to load history:", e);
      message.error("Failed to load history data");
    } finally {
      setHistoryLoading(false);
    }
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

  const getTriggerDots = () => {
    return triggers.map((t) => ({
      time: t.lastchange * 1000,
      description: t.description,
    }));
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

  const triggerColumns: ColumnsType<TriggerRow> = [
    { title: "Trigger", dataIndex: "description", width: 400 },
    { title: "Severity", dataIndex: "severity", width: 100 },
    { title: "Last Change", dataIndex: "lastchange", width: 200 },
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
            onChange={(h) => {
              setSelectedHosts(h);
              loadItems(h);
            }}
          />

          <Select
            placeholder="Select Item"
            style={{ width: 260 }}
            options={items.map((i) => ({
              label: i.name,
              value: i.itemid,
            }))}
            onChange={(itemid) => {
              setSelectedItem(itemid);
              loadTriggers(itemid);
            }}
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
          width={1200}
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
                    triggerRows,
                    chartRef.current,
                    historyHost
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
                triggers={getTriggerDots()}
              />
            </div>

            {triggerRows.length > 0 && (
              <div>
                <h3>Associated Triggers</h3>
                <Table
                  size="small"
                  columns={triggerColumns}
                  dataSource={triggerRows}
                  pagination={false}
                />
              </div>
            )}

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