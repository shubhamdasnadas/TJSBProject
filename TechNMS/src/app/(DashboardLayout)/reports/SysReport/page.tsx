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
   AXIOS CONFIG - FIXED TO GET FRESH TOKEN
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

/* 🔲 PAGE BORDER */
const drawPageBorder = (doc: jsPDF) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 20;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, w - margin * 2, h - margin * 2);
};

/* 🧊 WATERMARK */
const drawWatermark = (doc: jsPDF, png: string) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.addImage(png, "PNG", w / 2 - 110, h / 2 - 130, 220, 140);
  doc.setGState(new (doc as any).GState({ opacity: 1 }));
};

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

  // Simplified – only watermark + border
  const finalizePage = () => {
    drawWatermark(doc, logoPng);
    drawPageBorder(doc);
  };

  /* ===== PAGE 1: COVER ===== */
  const centerX = pageWidth / 2;

  doc.addImage(logoPng, "PNG", centerX - 120, 70, 240, 150);

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Techsec NMS – History Report", centerX, 260, { align: "center" });

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Host: ${host || "Unknown"}`, centerX, 320, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  const safeTitle = title.length > 70 ? title.substring(0, 67) + "..." : title;
  const titleLines = doc.splitTextToSize(`Item / Metric: ${safeTitle}`, CONTENT_WIDTH - 40);
  doc.text(titleLines, centerX, 355, { align: "center" });

  doc.setFontSize(13);
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${new Date().toLocaleString()}`, centerX, 410, { align: "center" });

  finalizePage();

  /* ===== PAGE 2: CHART ===== */
  if (chartEl) {
    doc.addPage();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Utilization Graph", MARGIN_X, 60);

    const canvas = await html2canvas(chartEl, {
      scale: 3,
      backgroundColor: "#ffffff",
      logging: false,
    });

    doc.addImage(canvas.toDataURL("image/png"), "PNG", MARGIN_X, 100, CONTENT_WIDTH, 220);

    finalizePage();
  }

  /* ===== PAGE 3+: HISTORY TABLE ===== */
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

  // Make sure the very last page also has watermark + border
  finalizePage();

  const safeHost = host.replace(/[^a-zA-Z0-9]/g, "_") || "unknown";
  doc.save(`techsec_history_${safeHost}_${Date.now()}.pdf`);
};
  //  SEVERITY COLOR
// ========================= */
const severityColor = (s?: number) => {
  if (s === undefined) return "red";
  if (s >= 4) return "#d32f2f"; // High / Disaster
  if (s === 3) return "#f57c00"; // Average
  return "#fbc02d"; // Warning
};

/* =========================
   HISTORY CHART
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
            tickFormatter={(v) =>
              new Date(v).toLocaleTimeString()
            }
          />
          <YAxis />
          <Tooltip
            labelFormatter={(v) =>
              new Date(Number(v)).toLocaleString()
            }
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
   PAGE
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
  const [currentItemId, setCurrentItemId] = useState("");
  const [currentValueType, setCurrentValueType] = useState<number>(3);
  const [historyDateRange, setHistoryDateRange] =
    useState<DateRange>({
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
        {
          jsonrpc: "2.0",
          method: "host.get",
          params: { output: ["hostid", "name"], groupids: groups },
          id: 2,
        },
        getAxiosConfig()
      );
      setHosts(r.data.result ?? []);
    } catch (err) {
      console.error("Failed to load hosts:", err);
      message.error("Failed to load hosts");
    }
  };

  /* APPLY - FETCH ITEMS */
  const handleApply = async () => {
    console.log("🔵 handleApply called with hosts:", selectedHosts);
    
    if (!selectedHosts.length) {
      return message.warning("Please select at least one host");
    }

    const token = localStorage.getItem("zabbix_auth");
    if (!token) {
      message.error("Not authenticated. Please log in.");
      return;
    }

    setLoadingTable(true);
    try {
      console.log("🔵 Calling item.get API...");
      
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "item.get",
          params: {
            output: [
              "itemid",
              "name",
              "lastvalue",
              "lastclock",
              "delta",
              "value_type",
            ],
            selectHosts: ["name"],
            hostids: selectedHosts,
          },
          id: 3,
        },
        getAxiosConfig()
      );

      console.log("✅ item.get API Response:", r.data);

      if (r.data.error) {
        message.error(`Zabbix API Error: ${r.data.error.message}`);
        console.error("Zabbix API Error:", r.data.error);
        return;
      }

      const items = (r.data.result || []).map((i: any) => ({
        key: i.itemid,
        itemid: i.itemid,
        host: i.hosts?.[0]?.name ?? "-",
        name: i.name,
        lastValue: i.lastvalue,
        lastCheck: new Date(i.lastclock * 1000).toLocaleString(),
        change: i.delta ?? "-",
        value_type: i.value_type,
      }));

      console.log(`✅ Loaded ${items.length} items`);
      setTableData(items);
      setFilteredData(items);
      message.success(`Loaded ${items.length} items`);
    } catch (error) {
      console.error("❌ Error fetching items:", error);
      message.error("Failed to fetch items. Check console for details.");
    } finally {
      setLoadingTable(false);
    }
  };

  /* SEARCH */
  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilteredData(
      tableData.filter((i) =>
        i.name.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  /* =========================
     OPEN HISTORY - Setup state only, data loaded by useEffect
  ========================= */
const openHistory = (
  itemid: string,
  name: string,
  host: string,
  valueType?: number
) => {
  setHistoryTitle(name);
  setHistoryHost(host);
  setCurrentItemId(itemid);
  setCurrentValueType(valueType !== undefined ? valueType : 3);
  
  // Set default time range to last 24 hours
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const newDateRange = {
    startDate: yesterday.toISOString().split('T')[0],
    startTime: yesterday.toTimeString().split(' ')[0],
    endDate: now.toISOString().split('T')[0],
    endTime: now.toTimeString().split(' ')[0],
  };
  
  setHistoryData([]); // Clear old data
  setHistoryOpen(true);
  setHistoryDateRange(newDateRange);
  // Data will be loaded by useEffect when historyDateRange changes
};

  /* =========================
     RELOAD HISTORY WHEN DATE RANGE CHANGES
  ========================= */
  const reloadHistoryWithDateRange = async (dateRange: DateRange) => {
    if (!currentItemId || !dateRange.startDate || !dateRange.endDate) return;

    setHistoryLoading(true);
    try {
      const start = new Date(
        `${dateRange.startDate} ${dateRange.startTime || "00:00:00"}`
      ).getTime() / 1000;

      const end = new Date(
        `${dateRange.endDate} ${dateRange.endTime || "23:59:59"}`
      ).getTime() / 1000;

      console.log(`🔵 Reloading history from ${new Date(start * 1000)} to ${new Date(end * 1000)}`);

      /* 1️⃣ GET HISTORY DATA WITH NEW TIME RANGE */
      const historyRes = await axios.post(
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
            limit: 1000,
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
        message.warning("No data found in selected time range");
        setHistoryData([]);
        return;
      }

      /* 2️⃣ GET TRIGGERS */
      const triggerRes = await axios.post(
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

      const triggers = triggerRes.data.result ?? [];
      const triggerIds = triggers.map((t: any) => t.triggerid);

      if (triggerIds.length > 0) {
        /* 3️⃣ GET EVENTS */
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
              limit: 500,
            },
            id: 102,
          },
          getAxiosConfig()
        );

        const events = eventRes.data.result ?? [];

        /* 4️⃣ MATCH EVENTS TO HISTORY POINTS */
        const MATCH_WINDOW = 120;
        events.forEach((ev: any) => {
          let closestIdx = -1;
          let bestDiff = MATCH_WINDOW + 1;

          historyPoints.forEach((p: any, idx: number) => {
            const diff = Math.abs(p.clock - Number(ev.clock));
            if (diff <= MATCH_WINDOW && diff < bestDiff) {
              bestDiff = diff;
              closestIdx = idx;
            }
          });

          if (closestIdx !== -1) {
            const trig = triggers.find((t: any) => t.triggerid === ev.objectid);
            historyPoints[closestIdx] = {
              ...historyPoints[closestIdx],
              isTrigger: true,
              triggerName: trig?.description || "Unknown Trigger",
              severity: trig?.priority ?? 0,
            };
          }
        });
      }

      setHistoryData(historyPoints);
      message.success(`Loaded ${historyPoints.length} data points`);
    } catch (e) {
      console.error("❌ Failed to reload history:", e);
      message.error("Failed to reload history");
    } finally {
      setHistoryLoading(false);
    }
  };

  /* =========================
     WATCH FOR DATE RANGE CHANGES
  ========================= */
  useEffect(() => {
    // Only reload if modal is open, we have valid dates, and we have an item ID
    // Skip the initial load (when dates are being set by openHistory)
    if (historyOpen && currentItemId && historyDateRange.startDate && historyDateRange.endDate) {
      // Use a timeout to debounce and avoid reloading during initial setup
      const timeoutId = setTimeout(() => {
        reloadHistoryWithDateRange(historyDateRange);
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [historyDateRange.startDate, historyDateRange.endDate, historyDateRange.startTime, historyDateRange.endTime]);

  const filterHistory = () => {
    // Data is already filtered by the API call, just return it
    return historyData;
  };

  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 180 },
    { title: "Item", dataIndex: "name", width: 350 },
    { title: "Last Value", dataIndex: "lastValue", width: 120 },
    { title: "Last Check", dataIndex: "lastCheck", width: 180 },
    { title: "Change", dataIndex: "change", width: 100 },
    {
      title: "History",
      render: (_, r) => (
        <Button
          size="small"
          onClick={() =>
            openHistory(r.itemid, r.name, r.host, r.value_type)
          }
        >
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
        />

        <Modal
          title={`${historyHost} – ${historyTitle}`}
          open={historyOpen}
          onCancel={() => {
            setHistoryOpen(false);
            setHistoryData([]);
            setCurrentItemId("");
          }}
          footer={null}
          width={900}
        >
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space style={{ justifyContent: "space-between", width: "100%" }}>
              <RangePickerDemo onRangeChange={setHistoryDateRange} />
              <Button
                type="primary"
                loading={historyLoading}
                onClick={() =>
                  exportHistoryToPDF(
                    historyTitle,
                    historyHost,
                    filterHistory(),
                    chartRef.current
                  )
                }
              >
                Export PDF
              </Button>
            </Space>

            <div ref={chartRef} style={{ background: "#fff", padding: 12 }}>
              <HistoryLineChart data={filterHistory()} />
            </div>

<Table
  size="small"
  pagination={{ pageSize: 10 }}
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
      render: (v) => {
        // If it's a number, show 2 decimals. If it's a string, just show the string.
        return typeof v === "number" ? v.toFixed(2) : v;
      },
    },
    // {
    //   title: "Status",
    //   render: (_, r: any) => 
    //     r.isTrigger ? (
    //       <span style={{ color: severityColor(r.severity), fontWeight: "bold" }}>
    //         🔔 {r.triggerName}
    //       </span>
    //     ) : null,
    // },
  ]}
  dataSource={filterHistory().map((r: any, idx: number) => ({
    key: `${r.clock}-${idx}`,
    ...r
  }))}
/>          </Space>
        </Modal>
      </Space>
    </Card>
  );
}