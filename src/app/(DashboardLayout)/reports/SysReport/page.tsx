"use client";
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Select,
  Button,
  Table,
  Space,
  Modal,
  Input,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Card } from "@mui/material";
import RangePickerDemo from "../../RangePickerDemo";

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
  value_type?: number;
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
const getAxiosConfig = () => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("zabbix_auth") || ""}`,
  },
});

/* =========================
   PDF HELPERS
========================= */
const TECHSEC_LOGO = "/images/logos/techsec-logo_name.svg";

const drawPageBorder = (doc: jsPDF) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 20;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, w - margin * 2, h - margin * 2);
};

const drawWatermark = (doc: jsPDF, png: string) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.addImage(png, "PNG", w / 2 - 110, h / 2 - 130, 220, 140);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
};

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
  host: string,
  data: any[],
  chartEl: HTMLDivElement | null
) => {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const MARGIN_X = 40;
  const CONTENT_WIDTH = pageWidth - MARGIN_X * 2;

  const logoPng = await loadSvgAsPng(TECHSEC_LOGO);

  const finalizePage = () => {
    drawWatermark(doc, logoPng);
    drawPageBorder(doc);
  };

  // Cover page
  const centerX = pageWidth / 2;
  doc.addImage(logoPng, "PNG", centerX - 120, 70, 240, 150);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Techsec NMS – History Report", centerX, 260, { align: "center" });
  doc.setFontSize(18);
  doc.text(`Host: ${host || "Unknown"}`, centerX, 320, { align: "center" });
  doc.setFontSize(16);
  const safeTitle = title.length > 70 ? title.substring(0, 67) + "..." : title;
  const titleLines = doc.splitTextToSize(`Item / Metric: ${safeTitle}`, CONTENT_WIDTH - 40);
  doc.text(titleLines, centerX, 355, { align: "center" });
  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, centerX, 410, { align: "center" });
  finalizePage();

  // Chart page
  if (chartEl) {
    doc.addPage();
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Utilization Graph", MARGIN_X, 60);
    const canvas = await html2canvas(chartEl, { scale: 3, backgroundColor: "#ffffff", logging: false });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", MARGIN_X, 100, CONTENT_WIDTH, 220);
    finalizePage();
  }

  // History table page
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("History Data", MARGIN_X, 60);

  autoTable(doc, {
    startY: 90,
    margin: { left: MARGIN_X, right: MARGIN_X },
    head: [["Time", "Value"]],
    body: data.map((r) => {
      const timeStr = new Date(r.clock * 1000).toLocaleString();
      let valueStr: string = "—";
      if (typeof r.value === "number" && !isNaN(r.value)) {
        valueStr = r.value.toFixed(2);
      } else if (typeof r.value === "string" && r.value.trim()) {
        valueStr = r.value;
      }
      return [timeStr, valueStr];
    }),
    styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak", valign: "middle" },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: "auto" } },
    didDrawPage: finalizePage,
  });

  finalizePage();

  const safeHost = host.replace(/[^a-zA-Z0-9]/g, "_") || "unknown";
  doc.save(`techsec_history_${safeHost}_${Date.now()}.pdf`);
};

/* =========================
   SEVERITY COLOR
========================= */
const severityColor = (s?: number) => {
  if (s === undefined) return "red";
  if (s >= 4) return "#d32f2f"; // High / Disaster
  if (s === 3) return "#f57c00"; // Average
  return "#fbc02d"; // Warning
};

/* =========================
   HISTORY CHART COMPONENT
========================= */
const HistoryLineChart = ({ data }: { data: any[] }) => {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    time: Number(d.clock) * 1000,
    value: Number(d.value),
    isTrigger: d.isTrigger,
    triggerName: d.triggerName,
    severity: d.severity,
  }));

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={(v) => new Date(v).toLocaleTimeString()}
          />
          <YAxis />
          <Tooltip
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div style={{ background: "#fff", padding: 8, border: "1px solid #ccc" }}>
                  <div>Time: {new Date(p.time).toLocaleString()}</div>
                  <div>Value: {p.value}</div>
                  {p.isTrigger && (
                    <>
                      <div style={{ color: severityColor(p.severity), fontWeight: "bold" }}>
                        🔔 Trigger: {p.triggerName}
                      </div>
                      <div>Severity: {p.severity}</div>
                    </>
                  )}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1890ff"
            strokeWidth={2}
            dot={(props: any) => {
              if (!props.payload?.isTrigger) return null;
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={6}
                  fill={severityColor(props.payload?.severity)}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/* =========================
   MAIN PAGE COMPONENT
========================= */
export default function SysReportPage() {
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [filteredData, setFilteredData] = useState<TableRow[]>([]);
  const [searchText, setSearchText] = useState("");

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

  const [currentHistoryItem, setCurrentHistoryItem] = useState<{
    itemid: string;
    name: string;
    host: string;
    valueType?: number;
  } | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);

  const DEFAULT_HISTORY_DAYS = 7;

  useEffect(() => {
    axios
      .post(
        "/api/zabbix-proxy",
        { jsonrpc: "2.0", method: "hostgroup.get", params: { output: ["groupid", "name"] }, id: 1 },
        getAxiosConfig()
      )
      .then((r) => setHostGroups(r.data.result ?? []))
      .catch((err) => {
        console.error("Failed to load host groups:", err);
        message.error("Failed to load host groups");
      });
  }, []);

  const loadHosts = async (groups: string[]) => {
    if (!groups.length) return setHosts([]);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        { jsonrpc: "2.0", method: "host.get", params: { output: ["hostid", "name"], groupids: groups }, id: 2 },
        getAxiosConfig()
      );
      setHosts(r.data.result ?? []);
    } catch (err) {
      console.error("Failed to load hosts:", err);
      message.error("Failed to load hosts");
    }
  };

  const handleApply = async () => {
    if (!selectedHosts.length) return message.warning("Please select at least one host");

    setLoadingTable(true);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "item.get",
          params: {
            output: ["itemid", "name", "lastvalue", "lastclock", "delta", "value_type"],
            selectHosts: ["name"],
            hostids: selectedHosts,
          },
          id: 3,
        },
        getAxiosConfig()
      );

      const items = (r.data.result || []).map((i: any) => ({
        key: i.itemid,
        itemid: i.itemid,
        host: i.hosts?.[0]?.name ?? "-",
        name: i.name,
        lastValue: i.lastvalue ?? "—",
        lastCheck: i.lastclock ? new Date(i.lastclock * 1000).toLocaleString() : "—",
        change: i.delta ?? "—",
        value_type: i.value_type,
      }));

      setTableData(items);
      setFilteredData(items);
      message.success(`Loaded ${items.length} items`);
    } catch (error) {
      console.error("Error fetching items:", error);
      message.error("Failed to fetch items");
    } finally {
      setLoadingTable(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilteredData(tableData.filter((i) => i.name.toLowerCase().includes(value.toLowerCase())));
  };

  const openHistory = async (
    itemid: string,
    name: string,
    host: string,
    valueType?: number
  ) => {
    setCurrentHistoryItem({ itemid, name, host, valueType });
    setHistoryTitle(name);
    setHistoryHost(host);
    setHistoryOpen(true);
    setHistoryLoading(true);

    const targetHistory = valueType !== undefined ? valueType : 3;

    let startSec: number;
    let endSec: number;
    const nowSec = Math.floor(Date.now() / 1000);

    if (historyDateRange.startDate && historyDateRange.endDate) {
      startSec = Math.floor(
        new Date(`${historyDateRange.startDate} ${historyDateRange.startTime || "00:00:00"}`).getTime() / 1000
      );
      endSec = Math.floor(
        new Date(`${historyDateRange.endDate} ${historyDateRange.endTime || "23:59:59"}`).getTime() / 1000
      );
      if (endSec > nowSec) endSec = nowSec;
      if (startSec >= endSec || startSec < 0) {
        startSec = nowSec - DEFAULT_HISTORY_DAYS * 86400;
        endSec = nowSec;
      }
    } else {
      startSec = nowSec - DEFAULT_HISTORY_DAYS * 86400;
      endSec = nowSec;

      const startObj = new Date(startSec * 1000);
      const endObj = new Date(endSec * 1000);
      setHistoryDateRange({
        startDate: startObj.toISOString().slice(0, 10),
        startTime: startObj.toTimeString().slice(0, 8),
        endDate: endObj.toISOString().slice(0, 10),
        endTime: endObj.toTimeString().slice(0, 8),
      });
    }

    try {
      const historyRes = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "history.get",
          params: {
            output: "extend",
            history: targetHistory,
            itemids: [itemid],
            time_from: startSec,
            time_till: endSec,
            sortfield: "clock",
            sortorder: "ASC",
            limit: 5000,
          },
          id: 100,
        },
        getAxiosConfig()
      );

      const historyPoints = (historyRes.data.result ?? []).map((h: any) => {
        const isNumeric = h.value !== "" && !isNaN(Number(h.value)) && isFinite(Number(h.value));
        return {
          clock: Number(h.clock),
          value: isNumeric ? Number(h.value) : h.value,
          isTrigger: false,
        };
      });

      if (!historyPoints.length) {
        message.warning("No history data found in the selected time range");
      }

      // Load triggers
      const triggerRes = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "trigger.get",
          params: {
            output: ["triggerid", "description", "priority"],
            itemids: [itemid],
            filter: { status: 0 },
          },
          id: 101,
        },
        getAxiosConfig()
      );

      const triggers = triggerRes.data.result ?? [];
      const triggerIds = triggers.map((t: any) => t.triggerid);

      // Load events (problems) if triggers exist
      if (triggerIds.length) {
        const eventRes = await axios.post(
          "/api/zabbix-proxy",
          {
            jsonrpc: "2.0",
            method: "event.get",
            params: {
              output: ["eventid", "clock", "objectid"],
              object: 0,
              objectids: triggerIds,
              value: 1,
              time_from: startSec,
              time_till: endSec,
              sortfield: "clock",
              sortorder: "ASC",
              limit: 500,
            },
            id: 102,
          },
          getAxiosConfig()
        );

        const events = eventRes.data.result ?? [];
        const MATCH_WINDOW = 120;

        events.forEach((ev: any) => {
          let closest = -1;
          let bestDiff = MATCH_WINDOW + 1;

          historyPoints.forEach((p: any, i: number) => {
            const diff = Math.abs(p.clock - Number(ev.clock));
            if (diff <= MATCH_WINDOW && diff < bestDiff) {
              bestDiff = diff;
              closest = i;
            }
          });

          if (closest !== -1) {
            const trig = triggers.find((t: any) => t.triggerid === ev.objectid);
            historyPoints[closest] = {
              ...historyPoints[closest],
              isTrigger: true,
              triggerName: trig?.description || "Unnamed trigger",
              severity: trig?.priority ?? 0,
            };
          }
        });
      }

      // Sort: newest first for table display
      const sortedHistory = [...historyPoints].sort((a, b) => b.clock - a.clock);
      setHistoryData(sortedHistory);

      // Optional: show oldest timestamp feedback
      if (sortedHistory.length > 0) {
        const oldest = sortedHistory[sortedHistory.length - 1];
        const oldestDate = new Date(oldest.clock * 1000).toLocaleDateString();
        message.info(`Showing data from ${oldestDate} (${sortedHistory.length} points)`);
      } else {
        message.info("No data points in selected range");
      }
    } catch (err) {
      console.error("History load failed:", err);
      message.error("Failed to load history data");
    } finally {
      setHistoryLoading(false);
    }
  };

  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 180 },
    { title: "Item", dataIndex: "name", width: 350 },
    { title: "Last Value", dataIndex: "lastValue", width: 120 },
    { title: "Last Check", dataIndex: "lastCheck", width: 180 },
    { title: "Change", dataIndex: "change", width: 100 },
    {
      title: "History",
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => openHistory(record.itemid, record.name, record.host, record.value_type)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Card style={{ padding: 35 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space wrap>
          <Select
            mode="multiple"
            placeholder="Host Groups"
            style={{ width: 260 }}
            options={hostGroups.map((g) => ({ label: g.name, value: g.groupid }))}
            onChange={(g) => {
              setSelectedGroups(g);
              setSelectedHosts([]);
              loadHosts(g);
            }}
            value={selectedGroups}
          />
          <Select
            mode="multiple"
            placeholder="Hosts"
            style={{ width: 260 }}
            options={hosts.map((h) => ({ label: h.name, value: h.hostid }))}
            onChange={setSelectedHosts}
            value={selectedHosts}
          />
          <Button type="primary" onClick={handleApply} loading={loadingTable}>
            Apply
          </Button>
        </Space>

        <Input.Search
          placeholder="Search item name"
          allowClear
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 400 }}
        />

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loadingTable}
          pagination={{ pageSize: 20 }}
          scroll={{ x: "max-content" }}
        />

        <Modal
          title={`${historyHost} – ${historyTitle}`}
          open={historyOpen}
          onCancel={() => setHistoryOpen(false)}
          footer={null}
          width={960}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 12 }}>
              <RangePickerDemo 
                itemId={currentHistoryItem?.itemid} 
                onRangeChange={(newRange) => {
                  setHistoryDateRange(newRange);
                  // Auto-refresh history when date range changes
                  if (currentHistoryItem) {
                    openHistory(
                      currentHistoryItem.itemid,
                      currentHistoryItem.name,
                      currentHistoryItem.host,
                      currentHistoryItem.valueType
                    );
                  }
                }} 
              />

              <Space>
                <Button
                  onClick={() =>
                    currentHistoryItem &&
                    openHistory(
                      currentHistoryItem.itemid,
                      currentHistoryItem.name,
                      currentHistoryItem.host,
                      currentHistoryItem.valueType
                    )
                  }
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  loading={historyLoading}
                  onClick={() =>
                    exportHistoryToPDF(historyTitle, historyHost, historyData, chartRef.current)
                  }
                >
                  Export PDF
                </Button>
              </Space>
            </Space>

            {historyDateRange.startDate && (
              <div style={{ color: "#faad14", fontSize: "0.9em", marginBottom: 12 }}>
                {(() => {
                  const start = new Date(
                    `${historyDateRange.startDate} ${historyDateRange.startTime || "00:00:00"}`
                  );
                  const daysBack = Math.floor((Date.now() - start.getTime()) / 86400000);
                  if (daysBack > 365) return "→ Note: Raw history older than 1 year is rarely kept.";
                  if (daysBack > 90) return "→ Most items keep raw history only 14–90 days.";
                  return null;
                })()}
              </div>
            )}

            <div ref={chartRef} style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
              <HistoryLineChart data={historyData} />
            </div>

            <Table
              size="small"
              pagination={{ pageSize: 10 }}
              loading={historyLoading}
              columns={[
                {
                  title: "Time",
                  dataIndex: "clock",
                  width: 180,
                  render: (v: number) => new Date(v * 1000).toLocaleString(),
                },
                {
                  title: "Value",
                  dataIndex: "value",
                  render: (v: any) => (typeof v === "number" ? v.toFixed(2) : v || "—"),
                },
              ]}
              dataSource={historyData.map((r, idx) => ({
                key: `${r.clock}-${idx}`,
                ...r,
              }))}
            />
          </Space>
        </Modal>
      </Space>
    </Card>
  );
}