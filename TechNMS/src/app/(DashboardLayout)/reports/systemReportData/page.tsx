"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Form,
  Table,
  Typography,
  Tag,
  Button,
  message,
} from "antd";
import axios from "axios";
import branches from "../../availability/data/data";
import jsPDF from "jspdf";
import dayjs from "dayjs";

const { Title } = Typography;

/* ===================== CONSTANTS ===================== */

const COLUMN_HEADER_MAP: Record<string, string> = {
  Hostname: "Host",
  branch: "Branch",
  "Memory utilization": "Memory Usage",
  "CPU utilization": "CPU Usage",
  'Interface ["GigabitEthernet0/0/0"]: Bits sent': "Primary Sent",
  'Interface ["GigabitEthernet0/0/0"]: Bits received': "Primary Received",
  'Interface ["GigabitEthernet0/0/0"]: Speed': "Primary Speed",
  'Interface ["GigabitEthernet0/0/1"]: Bits received': "Secondary Received",
  'Interface ["GigabitEthernet0/0/1"]: Bits sent': "Secondary Sent",
  'Interface ["GigabitEthernet0/0/1"]: Speed': "Secondary Speed",
};

const THRESHOLD = 75;
const CPU_KEY = "CPU utilization";
const MEM_KEY = "Memory utilization";
const PRIMARY_SENT_KEY =
  'Interface ["GigabitEthernet0/0/0"]: Bits sent';

/* ===================== HELPERS ===================== */

/* 🔧 UPDATED (robust but same responsibility) */
function getNumber(val: any): number | null {
  if (val === null || val === undefined) return null;

  // supports: 78, "78", "78.2", "78.2 (HIGH)"
  const match = String(val).match(/[\d.]+/);
  if (!match) return null;

  const n = Number(match[0]);
  return Number.isNaN(n) ? null : n;
}

function getTrafficRankValue(val: any): number {
  if (!val || val === "N/A") return -1;

  const m = String(val).match(/^([\d.]+)\s*(Kbps|Mbps|Gbps)$/i);
  if (!m) return -1;

  const num = Number(m[1]);
  const unit = m[2].toLowerCase();

  const multiplier =
    unit === "kbps" ? 1 :
      unit === "mbps" ? 1_000 :
        unit === "gbps" ? 1_000_000 : 0;

  return num * multiplier;
}

function getRowColorBySecondChar(hostname?: string) {
  const second = String(hostname || "")[1]?.toUpperCase() || "X";
  const map: Record<string, string> = {
    A: "#fff7e6",
    B: "#e6f7ff",
    C: "#f6ffed",
    D: "#fff0f6",
    E: "#f9f0ff",
  };
  return map[second] || "#fafafa";
}

/* ===================== COMPONENT ===================== */

const SystemReportData: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const findBranch = (host?: string) => {
    const b = branches.find(
      (x: any) =>
        host?.includes(x.code) ||
        host?.toLowerCase() === x.name.toLowerCase()
    );
    return b ? b.name : "-";
  };

  const loadCsv = async () => {
    const csvRes = await axios.get("/api/api_system_report_data/readCsv");

    const rawHeaders: string[] = csvRes.data.headers || [];

    const normalizedHeaders = rawHeaders.map((h) =>
      h === "Host" ? "Hostname" : h
    );

    setHeaders(normalizedHeaders);

    setRows(
      csvRes.data.rows.map((r: any, i: number) => {
        const hostname = r.Hostname || r.Host || "-";
        return {
          key: i,
          Hostname: hostname,
          branch: findBranch(hostname),
          ...r,
        };
      })
    );
  };

  useEffect(() => {
    loadCsv().catch(() => { });
  }, []);

  /* ===================== FETCH ===================== */

  const fetchCsvTable = async () => {
    try {
      setLoading(true);

      await axios.post("/api/api_system_report_data/get_history_data", {
        auth: localStorage.getItem("zabbix_auth"),
        groupids: ["210"],
      });

      while (true) {
        const status = await axios.get("/api/api_system_report_data/readStatus");
        message.loading(`Generating… ${status.data.progress}%`, 1);

        if (status.data.status === "DONE") break;
        if (status.data.status === "FAILED") {
          throw new Error("Generation failed");
        }

        await new Promise((r) => setTimeout(r, 1500));
      }

      await loadCsv();
      message.success("System report ready");
    } catch (e: any) {
      message.error(e?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  /* ===================== EXPORT CSV ===================== */

  const handleExportCSV = () => {
    if (!rows.length) return;

    const exportHeaders = ["Hostname", "branch", ...headers.filter(h => h !== "Hostname")];

    const csvHeaders = exportHeaders.map(
      (h) => COLUMN_HEADER_MAP[h] || h
    );

    const csvRows = rows.map((r) =>
      exportHeaders.map((h) => r[h] ?? "-")
    );

    const escape = (v: any) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csv = [csvHeaders, ...csvRows]
      .map((r) => r.map(escape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "System-Report.csv";
    link.click();
  };

  /* ===================== EXPORT PDF ===================== */

  const handleExportPDF = () => {
    if (!rows.length) return;

    const pdf = new jsPDF("l", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 12;
    let y = 32;
    const rowH = 7;

    const exportHeaders = ["Hostname", "branch", ...headers.filter(h => h !== "Hostname")];
    const titles = exportHeaders.map((h) => COLUMN_HEADER_MAP[h] || h);
    const colW = (pageW - margin * 2) / titles.length;

    pdf.setFontSize(14);
    pdf.text(
      "Techsec NMS – System Report (30 Days Avg)",
      pageW / 2,
      20,
      { align: "center" }
    );

    const drawHeader = () => {
      pdf.setFontSize(8);
      let x = margin;
      titles.forEach((t) => {
        pdf.rect(x, y, colW, rowH);
        pdf.text(t, x + 2, y + 5);
        x += colW;
      });
      y += rowH;
    };

    drawHeader();

    rows.forEach((r) => {
      if (y + rowH > pageH - margin) {
        pdf.addPage();
        y = 32;
        drawHeader();
      }

      let x = margin;

      exportHeaders.forEach((h) => {
        const val = r[h] ?? "-";
        let highlight = false;

        if (h === CPU_KEY || h === MEM_KEY) {
          const n = getNumber(val);
          if (n && n > THRESHOLD) highlight = true;
        }

        if (highlight) {
          pdf.setFillColor(255, 204, 204);
          pdf.rect(x, y, colW, rowH, "F");
        }

        pdf.rect(x, y, colW, rowH);
        pdf.text(String(val), x + 2, y + 5);
        x += colW;
      });

      y += rowH;
    });

    pdf.save("Techsec-System-Report.pdf");
  };

  /* ===================== TABLE ===================== */

  const columns = useMemo(() => {
    return [
      { title: "Host", dataIndex: "Hostname", fixed: "left", width: 200 },
      { title: "Branch", dataIndex: "branch", fixed: "left", width: 220 },
      ...headers
        .filter((h) => h !== "Hostname")
        .map((h) => ({
          title: COLUMN_HEADER_MAP[h] || h,
          dataIndex: h,
          align: "center" as const,
          sorter:
            h === "Primary Sent"
              ? (a: any, b: any) =>
                getTrafficRankValue(b[h]) - getTrafficRankValue(a[h])
              : undefined,

          sortDirections: ["descend", "ascend"] as any,


          /* 🎨 UPDATED ONLY HERE */
          render: (val: any) => {
            if (val === null || val === undefined || val === "N/A") {
              return <Tag color="red">N/A</Tag>;
            }

            const columnTitle = COLUMN_HEADER_MAP[h] || h;

            if (
              h === CPU_KEY ||
              h === MEM_KEY ||
              columnTitle === "CPU Usage" ||
              columnTitle === "Memory Usage"
            ) {
              const n = getNumber(val);
              const isHigh = typeof n === "number" && n > THRESHOLD;

              return (
                <div
                  style={{
                    backgroundColor: isHigh ? "#ff4d4f" : "transparent",
                    color: isHigh ? "#fff" : "inherit",
                    padding: "6px 8px",
                    borderRadius: 6,
                    fontWeight: isHigh ? 600 : 400,
                    textAlign: "center",
                  }}
                >
                  {val}
                </div>
              );
            }

            return val;
          },

        })),
    ];
  }, [headers]);

  /* ===================== UI ===================== */

  return (
    <Form layout="vertical">
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Title level={4}>System Report – 30 Days Average</Title>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={fetchCsvTable} loading={loading}>
              Generate Data
            </Button>
            <Button onClick={handleExportCSV} disabled={!rows.length}>
              Export Excel
            </Button>
            <Button type="primary" onClick={handleExportPDF} disabled={!rows.length}>
              Export PDF
            </Button>
          </div>
        </div>
      </Card>

      <Table
        loading={loading}
        bordered
        pagination={false}
        scroll={{ x: "max-content" }}
        dataSource={rows}
        columns={columns as any}
        onRow={(r) => ({
          style: { background: getRowColorBySecondChar(r.Hostname) },
        })}
      />
    </Form>
  );
};

export default SystemReportData;
