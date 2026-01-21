"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Card,
  Select,
  Button,
  Table,
  Space,
  Input,
  message,
  Modal,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import RangePickerDemo from "../../RangePickerDemo"; // adjust path if needed
import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/* ────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────
   AXIOS CONFIG
───────────────────────────────────────────────── */
const getAxiosConfig = () => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("zabbix_auth") || ""}`,
  },
});
const formatForDisplay = (bitsPerSec: number) => {
  if (!Number.isFinite(bitsPerSec)) return "—";

  if (bitsPerSec >= 1_000_000) {
    return `${(bitsPerSec / 1_000_000).toFixed(2)} Mbps`;
  }
  return `${(bitsPerSec / 1_000).toFixed(2)} Kbps`;
};

/* ────────────────────────────────────────────────
   PDF EXPORT HELPERS
───────────────────────────────────────────────── */
const TECHSEC_LOGO = "/images/logos/techsec-logo_name.svg";

const drawPageBorder = (doc: jsPDF) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 20;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, w - margin * 2, h - margin * 2);
};

const drawWatermark = (doc: jsPDF, png: string, pageNumber: number) => {
  if (pageNumber <= 1) return;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.addImage(png, "PNG", w / 2 - 110, h / 2 - 130, 220, 140);
  (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
};

const loadSvgAsPng = async (url: string): Promise<string> => {
  const svgText = await fetch(url).then((r) => r.text());
  const svgBlob = new Blob([svgText], { type: "image/svg+xml" });
  const svgUrl = URL.createObjectURL(svgBlob);

  return new Promise((resolve) => {
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
  chartEl: HTMLDivElement | null,
  isPercentage: boolean
) => {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const MARGIN_X = 40;
  const CONTENT_WIDTH = pageWidth - MARGIN_X * 2;
  const logoPng = await loadSvgAsPng(TECHSEC_LOGO);
  let pageNumber = 1;

  const finalizePage = () => {
    drawWatermark(doc, logoPng, pageNumber);
    drawPageBorder(doc);
  };

  // Cover page
  const centerX = pageWidth / 2;
  doc.addImage(logoPng, "PNG", centerX - 120, 70, 240, 150);
  pageNumber++;
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Techsec NMS – History Report", centerX, 260, { align: "center" });
  doc.setFontSize(18);
  doc.text(`Host: ${host || "Unknown"}`, centerX, 320, { align: "center" });
  doc.setFontSize(16);
  const safeTitle = title.length > 70 ? title.substring(0, 67) + "..." : title;
  const titleLines = doc.splitTextToSize(`Item: ${safeTitle}`, CONTENT_WIDTH - 40);
  doc.text(titleLines, centerX, 355, { align: "center" });
  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, centerX, 410, { align: "center" });
  finalizePage();

  // Chart page
  if (chartEl) {
    doc.addPage();
    pageNumber++;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Utilization Graph", MARGIN_X, 60);
    const canvas = await html2canvas(chartEl, { scale: 3, backgroundColor: "#ffffff" });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", MARGIN_X, 100, CONTENT_WIDTH, 220);
    finalizePage();
  }

  // Data table page(s)
  doc.addPage();
  pageNumber++;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("History Data", MARGIN_X, 60);

  autoTable(doc, {
    startY: 90,
    margin: { left: MARGIN_X, right: MARGIN_X },
    head: [["Time", "Value"]],
    body: data.map((r) => [
      new Date(r.clock * 1000).toLocaleString(),
      isPercentage ? Number(r.rawValue).toFixed(2) + " %" : formatForDisplay(r.bitsPerSec),
    ]),
    styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: "auto" } },
    didDrawPage: () => {
      drawWatermark(doc, logoPng, pageNumber);
      drawPageBorder(doc);
    },
  });

  const safeHost = host.replace(/[^a-zA-Z0-9]/g, "_") || "unknown";
  doc.save(`techsec_history_${safeHost}_${Date.now()}.pdf`);
};

/* ────────────────────────────────────────────────
   SEVERITY → COLOR
───────────────────────────────────────────────── */
const severityColor = (s?: number) => {
  if (s === undefined) return "#d32f2f";
  if (s >= 4) return "#d32f2f";     // High / Disaster – red
  if (s === 3) return "#f57c00";    // Average – orange
  if (s === 2) return "#fbc02d";    // Warning – yellow
  return "#1976d2";                 // Info / default – blue
};

/* ────────────────────────────────────────────────
   LINE CHART WITH TRIGGER DOTS
───────────────────────────────────────────────── */
const HistoryLineChart = ({ data, isPercentage }: { data: any[]; isPercentage: boolean }) => {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    time: Number(d.clock) * 1000,
    value: Number(d.value),
    rawValue: d.rawValue,
    bitsPerSec: d.bitsPerSec,
    isTrigger: !!d.isTrigger,
    triggerName: d.triggerName || "",
    severity: d.severity ?? 0,
  }));

  const maxValue = Math.max(
    ...chartData.map((d) => (Number.isFinite(d.value) ? d.value : 0)),
    0
  );

  // Add 20% headroom so peaks are visible
  const yMax = maxValue > 0 ? maxValue * 1.2 : 1;

  return (
    <div style={{ height: 280, background: "#fff", padding: "12px 8px" }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            label={{ value: "Time", position: "insideBottom", offset: -5 }}
          />
          <YAxis
            domain={[0, yMax]}
            tickFormatter={(v) =>
              isPercentage ? `${v.toFixed(0)} %` : `${v.toFixed(0)} Mbps`
            }
            label={{
              value: isPercentage ? "CPU Utilization (%)" : "Bandwidth (Mbps)",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            labelFormatter={(v) => new Date(Number(v)).toLocaleString()}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const p = payload[0].payload;

              return (
                <div style={{ background: "#fff", padding: 10, border: "1px solid #ccc", borderRadius: 4 }}>
                  <div>
                    <strong>Time:</strong> {new Date(p.time).toLocaleString()}
                  </div>
                  <div>
                    <strong>Value:</strong>{" "}
                    {isPercentage
                      ? p.rawValue.toFixed(2) + " %"
                      : formatForDisplay(p.bitsPerSec)}
                  </div>
                  {p.isTrigger && (
                    <>
                      <div style={{ color: severityColor(p.severity), fontWeight: "bold", marginTop: 6 }}>
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
              const { cx, cy, payload } = props;
              if (!payload?.isTrigger) return null;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={6}
                  fill={severityColor(payload.severity)}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ────────────────────────────────────────────────
   MAIN PAGE COMPONENT
───────────────────────────────────────────────── */
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
  const [currentItemId, setCurrentItemId] = useState("");
  const [currentValueType, setCurrentValueType] = useState<number>(3);
  const [isPercentage, setIsPercentage] = useState(false);

  const [historyDateRange, setHistoryDateRange] = useState<DateRange>({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const chartRef = useRef<HTMLDivElement>(null);

  // Load host groups once
  useEffect(() => {
    axios
      .post("/api/zabbix-proxy", { jsonrpc: "2.0", method: "hostgroup.get", params: { output: ["groupid", "name"] }, id: 1 }, getAxiosConfig())
      .then((r) => setHostGroups(r.data.result ?? []))
      .catch(() => message.error("Failed to load host groups"));
  }, []);

  // Keyboard navigation for pagination (Alt+N and Alt+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+N: Next page
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const totalPages = Math.ceil(filteredData.length / pageSize);
        if (currentPage < totalPages) {
          setCurrentPage(prev => prev + 1);
          message.info(`Page ${currentPage + 1} of ${totalPages}`);
        }
      }
      
      // Alt+P: Previous page
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (currentPage > 1) {
          setCurrentPage(prev => prev - 1);
          const totalPages = Math.ceil(filteredData.length / pageSize);
          message.info(`Page ${currentPage - 1} of ${totalPages}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pageSize, filteredData.length]);

  const loadHosts = async (groups: string[]) => {
    if (!groups.length) return setHosts([]);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        { jsonrpc: "2.0", method: "host.get", params: { output: ["hostid", "name"], groupids: groups }, id: 2 },
        getAxiosConfig()
      );
      setHosts(r.data.result ?? []);
    } catch {
      message.error("Failed to load hosts");
    }
  };
 
  const handleApply = async () => {
    if (!selectedHosts.length) return message.warning("Select at least one host");
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
        host: i.hosts?.[0]?.name ?? "—",
        name: i.name,
        lastValue: i.lastvalue ?? "—",
        lastCheck: i.lastclock ? new Date(i.lastclock * 1000).toLocaleString() : "—",
        change: i.delta ?? "—",
        value_type: i.value_type,
      }));

      setTableData(items);
      setFilteredData(items);
      setCurrentPage(1); // Reset to first page when new data loads
      message.success(`Loaded ${items.length} items`);
    } catch {
      message.error("Failed to fetch items");
    } finally {
      setLoadingTable(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilteredData(tableData.filter((i) => i.name.toLowerCase().includes(value.toLowerCase())));
    setCurrentPage(1); // Reset to first page when searching
  };

  const openHistory = (itemid: string, name: string, host: string, valueType?: number) => {
    setHistoryTitle(name);
    setHistoryHost(host);
    setCurrentItemId(itemid);
    const vType = valueType ?? 3;
    setCurrentValueType(vType);
    setIsPercentage(vType === 0);
    setHistoryData([]);

    // Default: last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setHistoryDateRange({
      startDate: yesterday.toISOString().split("T")[0],
      startTime: yesterday.toTimeString().split(" ")[0].slice(0, 8),
      endDate: now.toISOString().split("T")[0],
      endTime: now.toTimeString().split(" ")[0].slice(0, 8),
    });

    setHistoryOpen(true);
  };

  const reloadHistoryWithDateRange = async (range: DateRange) => {
    if (!currentItemId || !range.startDate || !range.endDate) return;
    setHistoryLoading(true);

    try {
      const start = new Date(`${range.startDate} ${range.startTime || "00:00:00"}`).getTime() / 1000;
      const end = new Date(`${range.endDate} ${range.endTime || "23:59:59"}`).getTime() / 1000;

      // 1. History
      const histRes = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "history.get",
          params: {
            output: "extend",
            history: currentValueType,
            itemids: [currentItemId],
            time_from: Math.floor(start),
            time_till: Math.floor(end),
            sortfield: "clock",
            sortorder: "ASC",
            limit: 1200,
          },
          id: 100,
        },
        getAxiosConfig()
      );

      let points = (histRes.data.result ?? []).map((h: any) => {
        const rawValue = Number(h.value);

        if (isPercentage) {
          // For history:0 (e.g., CPU utilization), use raw value with 2 decimals
          return {
            clock: Number(h.clock),
            value: rawValue, // for chart
            rawValue,
            bitsPerSec: null,
            isTrigger: false,
          };
        } else {
          // For history:3 (e.g., speed/bits), assume value is in bps, no *8
          const bitsPerSec = rawValue;
          return {
            clock: Number(h.clock),
            value: bitsPerSec / 1_000_000, // Mbps for chart
            rawValue,
            bitsPerSec,
            isTrigger: false,
          };
        }
      });

      if (!points.length) {
        message.warning("No history data in selected range");
        setHistoryData([]);
        return;
      }

      // 2. Triggers
      const trigRes = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "trigger.get",
          params: {
            output: ["triggerid", "description", "priority"],
            itemids: [currentItemId],
            filter: { status: 0 },
          },
          id: 101,
        },
        getAxiosConfig()
      );

      const triggers = trigRes.data.result ?? [];
      const triggerIds = triggers.map((t: any) => t.triggerid);

      if (triggerIds.length > 0) {
        // 3. Events (problems = value:1)
        const eventRes = await axios.post(
          "/api/zabbix-proxy",
          {
            jsonrpc: "2.0",
            method: "event.get",
            params: {
              output: ["eventid", "clock", "objectid", "value"],
              object: 0,
              objectids: triggerIds,
              value: 1,
              time_from: Math.floor(start),
              time_till: Math.floor(end),
              sortfield: "clock",
              sortorder: "DESC",
              limit: 300,
            },
            id: 102,
          },
          getAxiosConfig()
        );

        const events = eventRes.data.result ?? [];

        // 4. Match events to closest history point (±2 min)
        const MATCH_SEC = 120;
        events.forEach((ev: any) => {
          let bestIdx = -1;
          let bestDiff = MATCH_SEC + 1;
          points.forEach((p: any, i: number) => {
            const diff = Math.abs(p.clock - Number(ev.clock));
            if (diff <= MATCH_SEC && diff < bestDiff) {
              bestDiff = diff;
              bestIdx = i;
            }
          });
          if (bestIdx !== -1) {
            const trig = triggers.find((t: any) => t.triggerid === ev.objectid);
            points[bestIdx] = {
              ...points[bestIdx],
              isTrigger: true,
              triggerName: trig?.description || "Unnamed Trigger",
              severity: trig?.priority ?? 0,
            };
          }
        });
      }

      setHistoryData(points);
      message.success(`Loaded ${points.length} points`);
    } catch (err) {
      console.error(err);
      message.error("Failed to load history / triggers");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyOpen && currentItemId && historyDateRange.startDate && historyDateRange.endDate) {
      const timer = setTimeout(() => reloadHistoryWithDateRange(historyDateRange), 300);
      return () => clearTimeout(timer);
    }
  }, [historyDateRange, historyOpen, currentItemId]);

  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 180 },
    { title: "Item", dataIndex: "name", width: 340 },
    { title: "Last Value", dataIndex: "lastValue", width: 120 },
    { title: "Last Check", dataIndex: "lastCheck", width: 170 },
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
      width: 90,
    },
  ];

  return (
    <Card style={{ padding: 32 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="large">
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

        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Input.Search
            placeholder="Search item name…"
            allowClear
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ maxWidth: 420 }}
          />
          <div style={{ fontSize: 12, color: "#888" }}>
            Tip: Use Alt+N (next) / Alt+P (previous) to navigate pages
          </div>
        </Space>

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loadingTable}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            onChange: (page, newPageSize) => {
              setCurrentPage(page);
              if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
              }
            },
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          scroll={{ x: "max-content" }}
        />
      </Space>

      {/* ─── History Modal ──────────────────────────────────────── */}
      <Modal
        title={`${historyHost} – ${historyTitle}`}
        open={historyOpen}
        onCancel={() => {
          setHistoryOpen(false);
          setHistoryData([]);
          setCurrentItemId("");
        }}
        footer={null}
        width={960}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space style={{ justifyContent: "space-between", width: "100%" }}>
            <RangePickerDemo onRangeChange={setHistoryDateRange} />
            <Button
              type="primary"
              loading={historyLoading}
              onClick={() => exportHistoryToPDF(historyTitle, historyHost, historyData, chartRef.current, isPercentage)}
            >
              Export to PDF
            </Button>
          </Space>

          <div ref={chartRef}>
            <HistoryLineChart data={historyData} isPercentage={isPercentage} />
          </div>

          <Table
            size="small"
            loading={historyLoading}
            pagination={{ pageSize: 12 }}
            columns={[
              {
                title: "Time",
                dataIndex: "clock",
                render: (v: number) => new Date(v * 1000).toLocaleString(),
                width: 180,
              },
              {
                title: "Value",
                dataIndex: "value",
                align: "center",
                render: (_: any, r: any) =>
                  isPercentage
                    ? r.rawValue.toFixed(2) + " %"
                    : formatForDisplay(r.bitsPerSec),
              },
            ]}
            dataSource={historyData.map((r, i) => ({ key: `${r.clock}-${i}`, ...r }))}
          />
        </Space>
      </Modal>
    </Card>
  );
}