"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, Select, Table, Button, Row, Col, message, Tooltip, Space } from "antd";
import { DownOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { DatePicker, Dropdown } from "antd";
import dayjs, { Dayjs } from "dayjs";
import autoTable from 'jspdf-autotable';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ExportOutlined } from '@ant-design/icons';
import branches from "../../availability/data/data";
const { RangePicker } = DatePicker;
const { Option } = Select;
const TECHSEC_LOGO = "/images/logos/techsec-logo_name.svg";  // ← adjust path if needed
const axiosCfg = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : ""}`,
  },
};

/* =======================
   Preset definitions (same as your first snippet)
======================= */
const presetOptions = [
  { key: "5m", label: "Last 5 minutes", minutes: 5 },
  { key: "30m", label: "Last 30 minutes", minutes: 30 },
  { key: "1h", label: "Last 1 hour", minutes: 60 },
  { key: "6h", label: "Last 6 hours", minutes: 360 },
  { key: "12h", label: "Last 12 hours", minutes: 720 },
  { key: "1d", label: "Last 24 hours", minutes: 1440 },
  { key: "3d", label: "Last 3 days", minutes: 4320 },
  { key: "7d", label: "Last 7 days", minutes: 10080 },
  { key: "30d", label: "Last 30 days", minutes: 43200 },
  { key: "90d", label: "Last 90 days", minutes: 129600 },
  { key: "180d", label: "Last 6 months", minutes: 259200 },
  { key: "365d", label: "Last 1 year", minutes: 525600 },
  {
    key: "maxhist",
    label: "Oldest available (~90–365d)",
    minutes: 525600 * 2, // fallback only
  },
];


const severityList: Record<number, string> = {
  0: "Not classified",
  1: "Information",
  2: "Warning",
  3: "Average",
  4: "High",
  5: "Disaster",
};

// ────────────────────────────────────────────────
// BRANCH HELPER FUNCTION
// ────────────────────────────────────────────────
function getBranchNameByHostname(hostname: string) {
  if (!hostname) return "Unknown";
  const found = branches.find((b: any) =>
    hostname.toLowerCase().includes(b.code?.toLowerCase())
  );
  return found ? found.name : "Unknown";
}

// ────────────────────────────────────────────────
// PDF HELPERS (reused from history report)
// ────────────────────────────────────────────────

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

const drawPageBorder = (doc: jsPDF) => {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 20;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, w - margin * 2, h - margin * 2);
};

const drawWatermark = (doc: jsPDF, png: string, pageNumber: number) => {
  if (pageNumber <= 1) return; // no watermark on cover
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
  doc.addImage(png, "PNG", w / 2 - 110, h / 2 - 130, 220, 140);
  (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));
};

//export pdf  history 
const exportTopProblemsToPDF = async (data: any[], timeFrom: number, timeTill: number, groupids: string[], hostids: string[], hosts: any[]  // Add this parameter
) => {
  if (!data || data.length === 0) {
    message.warning("No data to export");
    return;
  }

  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const MARGIN_X = 45;  // Increased left margin
  const MARGIN_Y = 40;
  const BORDER_MARGIN = 20;  // Border margin
  const CONTENT_WIDTH = pageWidth - MARGIN_X * 2;
  const centerX = pageWidth / 2;

  let logoPng: string;
  try {
    logoPng = await loadSvgAsPng(TECHSEC_LOGO);
  } catch (err) {
    console.error("Failed to load logo", err);
    message.warning("Could not load logo – exporting without it");
    logoPng = "";
  }

  // ─── Cover Page (page 1) ─────────────────────────────────────
  if (logoPng) {
    doc.addImage(logoPng, "PNG", centerX - 120, 70, 240, 150);
  }

  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("Techsec NMS – Top Problems Report", centerX, 260, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);

  const formatDateSafe = (timestamp: number) => {
    try {
      return dayjs.unix(timestamp).format("YYYY-MM-DD HH:mm");
    } catch (e) {
      return "—";
    }
  };

  const rangeText = `Period: ${formatDateSafe(timeFrom)} – ${formatDateSafe(timeTill)}`;

  doc.text(rangeText, centerX, 320, { align: "center" });

  // ─── BRANCH LOGIC - Extract branches from selected hosts ─────
  const selectedHosts = hosts.filter((h: any) => hostids.includes(h.hostid));
  const branchNames = selectedHosts.map((h: any) => getBranchNameByHostname(h.name));
  const uniqueBranches = Array.from(new Set(branchNames)).filter(b => b !== "Unknown");

  // Display branches on cover page
  if (uniqueBranches.length > 0) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const branchText = uniqueBranches.length === 1
      ? `Branch: ${uniqueBranches[0]}`
      : `Branches: ${uniqueBranches.join(', ')}`;
    doc.text(branchText, centerX, 400, { align: "center" });
  }

  // Display host names below branches
  const hostNames = selectedHosts.map((h: any) => h.name).join(', ');
  if (hostNames) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    // Split long host names into multiple lines if needed
    const maxWidth = pageWidth - 100;
    const lines = doc.splitTextToSize(`Hosts: ${hostNames}`, maxWidth);

    let yPosition = 425;
    lines.forEach((line: string) => {
      doc.text(line, centerX, yPosition, { align: "center" });
      yPosition += 18;
    });

    // Adjust generated timestamp position based on number of lines
    doc.setFontSize(13);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, centerX, yPosition + 10, { align: "center" });
  } else {
    doc.setFontSize(13);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, centerX, 425, { align: "center" });
  }

  drawPageBorder(doc);

  // ─── Data Page(s) ────────────────────────────────────────────
  doc.addPage();

  // Draw header on first data page
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Top Problem Triggers by Occurrence Count", centerX, 60, { align: "center" });

  autoTable(doc, {
    startY: 85,
    margin: {
      left: MARGIN_X,
      right: MARGIN_X,
      top: BORDER_MARGIN + 20,
      bottom: BORDER_MARGIN + 20
    },
    head: [["Host", "Branch", "Trigger", "Severity", "Occurrences"]],
    body: data.map((row: any) => [
      row.host || "—",
      getBranchNameByHostname(row.host),
      row.trigger || "—",
      row.severity || "Unknown",
      row.count ?? 0,
    ]),
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 5,
      overflow: 'linebreak',
      lineColor: [44, 62, 80],
      lineWidth: 0.4,
      textColor: [33, 33, 33],
      font: 'helvetica',
      minCellHeight: 20,
    },
    headStyles: {
      fillColor: [26, 46, 78],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      lineWidth: 0.6,
      halign: 'center',
      minCellHeight: 25,
    },
    columnStyles: {
      0: { cellWidth: 90, halign: 'left' },    // Host
      1: { cellWidth: 65, halign: 'left' },    // Host
      2: { cellWidth: 245, halign: 'left' },    // Trigger
      3: { cellWidth: 65, halign: 'center' },   // Severity
      4: { cellWidth: 50, halign: 'center', fontStyle: 'bold' }, // Occurrences
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 2) {
        const severity = (data.cell.text?.[0] || '').trim();
        const color = getSeverityColor(severity);
        data.cell.styles.textColor = color;
        data.cell.styles.fontStyle = 'bold';

        // Light backgrounds for severity
        if (severity === 'Disaster') data.cell.styles.fillColor = [255, 235, 238];
        if (severity === 'High') data.cell.styles.fillColor = [255, 241, 235];
        if (severity === 'Average') data.cell.styles.fillColor = [255, 249, 230];
        if (severity === 'Warning') data.cell.styles.fillColor = [255, 252, 240];
        if (severity === 'Information') data.cell.styles.fillColor = [240, 248, 255];
      }
    },
    didDrawPage: (hookData) => {
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

      // Apply watermark and border to all pages except cover (page 1)
      if (currentPage > 1) {
        if (logoPng) drawWatermark(doc, logoPng, currentPage);
        drawPageBorder(doc);

        // Add page number footer
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(
          `Page ${currentPage - 1} | Techsec Digital`,
          centerX,
          pageHeight - 25,
          { align: 'center' }
        );
      }
    },
  });

  // Save
  const filename = `techsec_top_problems_${dayjs().format("YYYY-MM-DD_HH-mm")}.pdf`;
  doc.save(filename);

  message.success("PDF exported successfully");
};
/* =======================
   Range Picker Component (embedded version)
======================= */
function RangePickerWithPresets({
  onRangeChange,
  defaultValue = [dayjs().subtract(1, "day"), dayjs()],
}: {
  onRangeChange: (range: { from: number; to: number; startDate: string; endDate: string }) => void;
  defaultValue?: [Dayjs, Dayjs];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [dates, setDates] = useState<[Dayjs, Dayjs] | null>(defaultValue);

  useEffect(() => {
    if (defaultValue && !dates) {
      setDates(defaultValue);
      handleChange(defaultValue);
    }
  }, []);

  const handleChange = (range: [Dayjs, Dayjs] | null) => {
    if (!range) return;
    const [start, end] = range;
    setDates([start, end]);

    onRangeChange({
      from: start.unix(),
      to: end.unix(),
      startDate: start.format("YYYY-MM-DD HH:mm:ss"),
      endDate: end.format("YYYY-MM-DD HH:mm:ss"),
    });
  };

  const menuItems = [
    ...presetOptions.map((opt) => ({
      key: opt.key,
      label: opt.label,
      onClick: () => {
        if (opt.key === "maxhist") {
          message.info("Max history not implemented in this version (needs item-specific oldest time)");
          return;
        }
        const start = dayjs().subtract(opt.minutes, "minute");
        const end = dayjs();
        setDates([start, end]);
        handleChange([start, end]);
        setPickerOpen(false);
      },
    })),
    {
      key: "custom",
      label: (
        <div
          style={{ paddingTop: 6 }}
          onClick={(e) => {
            e.stopPropagation();
            setPanelVisible(true);
          }}
        >
          Custom Range
          <RangePicker
            open={panelVisible}
            value={dates}
            onOpenChange={setPanelVisible}
            onChange={(range) => {
              if (range) {
                setDates(range as [Dayjs, Dayjs]);
                handleChange(range as [Dayjs, Dayjs]);
                setPanelVisible(false);
                setPickerOpen(false);
              }
            }}
            style={{ opacity: 0, height: 0, position: "absolute", pointerEvents: "none" }}
          />
        </div>
      ),
    },
  ];
  // Trigger name filter (applied on Apply)
  const [triggerSearch, setTriggerSearch] = useState<string>("");

  const displayText = dates
    ? `${dates[0].format("YYYY-MM-DD HH:mm")} → ${dates[1].format("YYYY-MM-DD HH:mm")}`
    : "Select date range";

  return (
    <Dropdown
      open={pickerOpen}
      trigger={["click"]}
      onOpenChange={setPickerOpen}
      menu={{ items: menuItems }}
    >
      <Space
        className="border rounded px-3 py-1 cursor-pointer bg-[#1f1f1f] text-gray-300 hover:bg-[#2a2a2a]"
        style={{ width: 260, justifyContent: "space-between" }}
      >
        <span>{displayText}</span>
        <Space size={4}>
          <InfoCircleOutlined style={{ color: "#888" }} />
          <DownOutlined />
        </Space>
      </Space>
    </Dropdown>
  );
}

/* =======================
   Main Component
======================= */
export default function ZabbixTopProblemsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [groupids, setGroupids] = useState<string[]>([]);
  const [hostids, setHostids] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggerSearch, setTriggerSearch] = useState<string>("");

  const [timeFrom, setTimeFrom] = useState<number>(Math.floor(Date.now() / 1000) - 24 * 3600);
  const [timeTill, setTimeTill] = useState<number>(Math.floor(Date.now() / 1000));
  const [selectedSeverities, setSelectedSeverities] = useState<number[]>([1,2,3,4,5]);

  const severityOptions = Object.entries(severityList).map(
    ([value, label]) => ({
      label,
      value: Number(value),
    })
  );
  console.log("data", selectedSeverities)
  /* Load host groups */
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
      .then((r) => setGroups(r.data.result ?? []))
      .catch((err) => console.error("Failed to load groups", err));
  }, []);

  /* Load hosts when groups change */
  const loadHosts = async (gids: string[]) => {
    setGroupids(gids);
    setHosts([]);
    setHostids([]);
    setData([]);

    if (!gids.length) return;

    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "host.get",
          params: { output: ["hostid", "name"], groupids: gids },
          id: 2,
        },
        axiosCfg
      );
      setHosts(r.data.result ?? []);
    } catch (err) {
      console.error("Failed to load hosts", err);
    }
  };

  /* Load problems with occurrence count */
  const loadTable = async () => {
    if ((!groupids.length && !hostids.length) || timeTill <= timeFrom) {
      message.warning("Select at least one group/host and valid time range");
      return;
    }

    setLoading(true);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "event.get",
          params: {
            output: ["eventid", "name", "objectid"],
            selectHosts: ["hostid", "name"],
            selectRelatedObject: ["triggerid", "description", "priority"], // priority = severity
            groupids: groupids.length ? groupids : undefined,
            hostids: hostids.length ? hostids : undefined,
            value: 1, // PROBLEM events only
            time_from: timeFrom,
            time_till: timeTill,
            severities: selectedSeverities || "",
            sortfield: "clock",
            sortorder: "DESC",
          },
          id: 3,
        },
        axiosCfg
      );

      const events = r.data.result ?? [];

      const map: Record<string, any> = {};

      events.forEach((e: any) => {
        const trigger = e.relatedObject || {};
        const severityNum = Number(trigger.priority ?? 0);
        const severityMap: Record<number, string> = {
          0: "Not classified",
          1: "Information",
          2: "Warning",
          3: "Average",
          4: "High",
          5: "Disaster",
        };
        const severity = severityMap[severityNum] || "Unknown";

        e.hosts?.forEach((h: any) => {
          const key = `${h.hostid}-${e.name}`;

          if (!map[key]) {
            map[key] = {
              key,
              host: h.name,
              trigger: e.name || trigger.description || "Unknown trigger",
              severity,
              count: 0,
            };
          }
          map[key].count++;
        });
      });

      let rows = Object.values(map);

      // 🔍 APPLY trigger filter ONLY when Apply is pressed
      if (triggerSearch.trim()) {
        const q = triggerSearch.toLowerCase();
        rows = rows.filter((r: any) =>
          r.trigger?.toLowerCase().includes(q)
        );
      }

      // Sort by occurrence count DESC
      const sorted = rows.sort((a: any, b: any) => b.count - a.count);
      setData(sorted);

      // Sort by count descending
    } catch (err) {
      console.error("Failed to load events", err);
      message.error("Failed to load problems");
    } finally {
      setLoading(false);
    }
  };

  const exportTopProblemsToCSV = (
    data: any[],
    hostids: string[],
    hosts: any[],
    timeFrom: number,
    timeTill: number
  ) => {
    if (!data || data.length === 0) {
      message.warning("No data to export");
      return;
    }

    // Same columns as PDF
    const headers = ["Host", "Branch", "Trigger", "Severity", "Occurrences"];

    const escapeCSV = (value: any) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = data.map((row: any) => [
      row.host || "—",
      getBranchNameByHostname(row.host),
      row.trigger || "—",
      row.severity || "Unknown",
      row.count ?? 0,
    ]);

    // Optional metadata header (nice touch)
    const metaLines = [
      `Report: Techsec NMS – Top Problems`,
      `Period: ${dayjs.unix(timeFrom).format("YYYY-MM-DD HH:mm")} – ${dayjs
        .unix(timeTill)
        .format("YYYY-MM-DD HH:mm")}`,
      "",
    ];

    const csvContent =
      metaLines.join("\n") +
      [headers, ...rows]
        .map((r) => r.map(escapeCSV).join(","))
        .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `techsec_top_problems_${dayjs().format(
      "YYYY-MM-DD_HH-mm"
    )}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
    message.success("CSV exported successfully");
  };


  return (
    <Card title="Top Problems (Occurrence Count)">
      <Row gutter={16} align="middle" style={{ width: "100%" }}>
        <Col span={6}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="Host Groups"
            style={{ width: "100%" }}
            onChange={loadHosts}
          >
            {groups.map((g) => (
              <Option key={g.groupid} value={g.groupid} label={g.name}>
                {g.name}
              </Option>
            ))}
          </Select>
        </Col>

        <Col span={6}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="Hosts"
            style={{ width: "100%" }}
            value={hostids}
            onChange={setHostids}
            disabled={!hosts.length}
          >
            {hosts.map((h) => (
              <Option key={h.hostid} value={h.hostid} label={h.name}>
                {h.name}
              </Option>
            ))}
          </Select>
        </Col>


        <Col flex="400px">
          <div
            style={{
              width: '2',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <RangePickerWithPresets
              onRangeChange={({ from, to }) => {
                setTimeFrom(from);
                setTimeTill(to);
              }}
            />
          </div>
        </Col>
        <Col span={1} >
          <Button type="primary" onClick={loadTable} loading={loading}  >
            Apply
          </Button>
        </Col>
      </Row>
      <Row gutter={16} align="middle" style={{ width: "100%", marginTop: 16 }}>
        <Col>
          <Button
            type="default"
            icon={<ExportOutlined />}

            onClick={() => exportTopProblemsToPDF(data, timeFrom, timeTill, groupids, hostids, hosts)}
            disabled={loading || !data.length}

          >
            Export to PDF
          </Button>
        </Col>

        <Col>
          <Button
            type="default"
            icon={<ExportOutlined />}
            onClick={() =>
              exportTopProblemsToCSV(
                data,
                hostids,
                hosts,
                timeFrom,
                timeTill
              )
            }
            disabled={loading || !data.length}
          >
            Export to CSV
          </Button>
        </Col>
        <Col span={6}>
          <Select
            showSearch
            allowClear
            placeholder="Filter Trigger Name (contains)"
            style={{ width: "100%" }}
            value={triggerSearch || undefined}
            onChange={(val) => setTriggerSearch(val || "")}
            options={Array.from(new Set(data.map(d => d.trigger))).map(t => ({
              label: t,
              value: t,
            }))}
          />
        </Col>
        <Col>
          <Select
            mode="multiple"
            allowClear
            placeholder="Select Severity"
            style={{ width: 280 }}
            options={severityOptions}
            value={selectedSeverities}
            onChange={(values) => setSelectedSeverities(values)}
          />
        </Col>
      </Row>

      <Table
        style={{ marginTop: 24 }}
        bordered
        loading={loading}
        rowKey="key"
        dataSource={data}
        pagination={{ pageSize: 15 }}
        columns={[
          { title: "Host", dataIndex: "host", width: 180 },
          { title: "Trigger", dataIndex: "trigger" },
          {
            title: "Severity",
            dataIndex: "severity",
            width: 140,
            render: (text: string) => {
              // Determine background color based on severity
              let bgColor = '#f5f5f5';  // default gray

              if (text === 'Disaster') bgColor = '#d32029';      // light red
              if (text === 'High') bgColor = '#f53d3d';          // light orange
              if (text === 'Average') bgColor = '#fa8c16';       // light yellow
              if (text === 'Warning') bgColor = '#fae900';       // very light yellow
              if (text === 'Information') bgColor = '#69c0ff';   // light blue

              return (
                <span
                  style={{
                    color: getSeverityColor(text),
                    fontWeight: 'bold',
                    backgroundColor: bgColor,
                    padding: '4px 12px',
                    borderRadius: '4px',
                    display: 'inline-block',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  {text}
                </span>
              );
            },
          },
          {
            title: "Occurrences",
            dataIndex: "count",
            width: 140,
            sorter: (a: any, b: any) => a.count - b.count,
            defaultSortOrder: "descend",
          },
        ]}
      />    </Card>
  );
}

/* Optional: color coding for severity */
function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    Disaster: "#d32029",
    High: "#f53d3d",
    Average: "#fa8c16",
    Warning: "#fddc04",
    Information: "#69c0ff",
    "Not classified": "#d9d9d9",
  };
  return colors[severity] || "#a97bff";
}
