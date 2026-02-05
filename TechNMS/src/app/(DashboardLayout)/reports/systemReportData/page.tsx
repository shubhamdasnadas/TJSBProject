"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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


const { Title, Text } = Typography;

/* ===================== CONSTANTS ===================== */

const COLUMN_HEADER_MAP: Record<string, string> = {
  Hostname: "Host",
  branch: "Branch",
  "Memory utilization": "Memory Usage (Avg)",
  "CPU utilization": "CPU Usage (Avg)",
  'Interface ["GigabitEthernet0/0/0"]: Bits sent': "Primary Sent (Avg)",
  'Interface ["GigabitEthernet0/0/0"]: Bits received': "Primary Received (Avg)",
  'Interface ["GigabitEthernet0/0/1"]: Bits received': "Secondary Received (Avg)",
  'Interface ["GigabitEthernet0/0/1"]: Bits sent': "Secondary Sent (Avg)",
};

const THRESHOLD = 75;
const CPU_KEY = "CPU utilization";
const MEM_KEY = "Memory utilization";
const PRIMARY_SENT_KEY =
  'Interface ["GigabitEthernet0/0/0"]: Bits sent';

/* ===================== HELPERS ===================== */

function getNumber(val: any): number | null {
  const num = Number(String(val).trim());
  return Number.isNaN(num) ? null : num;
}

function getTrafficRankValue(val: any): number {
  if (!val || val === "N/A") return -1;
  const match = String(val).match(/^([\d.]+)\s*(Kbps|Mbps|Gbps)$/i);
  if (!match) return -1;

  const num = Number(match[1]);
  const unit = match[2].toLowerCase();

  const rank =
    unit === "kbps" ? 1 :
      unit === "mbps" ? 2 :
        unit === "gbps" ? 3 : 0;

  return rank * 1_000_000_000 + num;
}

const formatCellValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "-";
  return val;
};

function getRowColorBySecondChar(hostname?: string) {
  const second = String(hostname || "")[1]?.toUpperCase() || "X";
  const colors: Record<string, string> = {
    A: "#fff7e6",
    B: "#e6f7ff",
    C: "#f6ffed",
    D: "#fff0f6",
    E: "#f9f0ff",
  };
  return colors[second] || "#fafafa";
}

/* ===================== COMPONENT ===================== */

const SystemReportData: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const findBranch = (hostName?: string) => {
    const match =
      branches.find(
        (b: any) =>
          hostName?.includes(b.code) ||
          hostName?.toLowerCase() === b.name.toLowerCase()
      ) ?? null;
    return match ? match.name : "-";
  };

  /* ===================== FETCH DATA FLOW ===================== */

  const fetchCsvTable = async () => {
    try {
      setLoading(true);

      // 1️⃣ Trigger history generation
      const startRes = await axios.post(
        "/api/api_system_report_data/get_history_data",
        {
          auth: localStorage.getItem("zabbix_auth"),
          groupids: ["210"],
        }
      );

      const { statusUrl } = startRes.data;

      // 2️⃣ Poll status
      while (true) {
        const statusRes = await axios.get(statusUrl, {
          headers: { "Cache-Control": "no-cache" },
        });

        if (statusRes.data.status === "DONE") break;
        if (statusRes.data.status === "FAILED") {
          throw new Error(statusRes.data.error || "Job failed");
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      // 3️⃣ Read CSV
      const csvRes = await axios.get("/api/api_system_report_data/readCsv");
      const csvHeaders = csvRes.data?.headers ?? [];
      const csvRows = csvRes.data?.rows ?? [];

      setHeaders(csvHeaders);
      setFileName(csvRes.data?.fileName ?? "");

      setRows(
        csvRows.map((r: any, idx: number) => ({
          key: `${r?.Hostname}_${idx}`,
          Hostname: r?.Hostname ?? "-",
          branch: findBranch(r?.Hostname),
          ...r,
        }))
      );

      message.success("System report loaded");
    } catch (err: any) {
      console.error(err);
      message.error(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  /* ===================== EXPORT EXCEL ===================== */

  const handleExportCSV = () => {
    if (!rows.length) {
      message.warning("No data to export");
      return;
    }

    // 1️⃣ Build CSV headers (mapped names)
    const csvHeaders = headers.map(
      (h) => COLUMN_HEADER_MAP[h] || h
    );

    // 2️⃣ Build CSV rows
    const csvRows = rows.map((r) =>
      headers.map((h) => {
        const val = r[h];
        return val === null || val === undefined || val === ""
          ? "-"
          : val;
      })
    );

    // 3️⃣ CSV escape helper (same as your history export)
    const escapeCSV = (value: any) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // 4️⃣ Build CSV content
    const csvContent = [csvHeaders, ...csvRows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    // 5️⃣ Download CSV
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "System-Report.csv";
    link.click();

    URL.revokeObjectURL(link.href);
  };


  /* ===================== EXPORT PDF ===================== */

  const handleExportPDF = async () => {
    if (!rows.length) {
      message.warning("No data to export");
      return;
    }

    const pdf = new jsPDF("l", "mm", "a4"); // landscape for wide tables
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const logo = "/images/logos/techsec-logo_name.png";
    const generatedAt = dayjs().format("DD/MM/YYYY, h:mm a");
    const margin = 12;

    /* ================= COMMON HELPERS ================= */

    const drawPageBorder = () => {
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.5);
      pdf.rect(
        margin,
        margin,
        pageWidth - margin * 2,
        pageHeight - margin * 2
      );
    };

    const drawWatermark = (opacity = 0.05) => {
      pdf.setGState(new (pdf as any).GState({ opacity }));
      pdf.addImage(
        logo,
        "PNG",
        pageWidth / 2 - 90,
        pageHeight / 2 - 45,
        180,
        90
      );
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    };

    /* ================= PAGE HEADER ================= */

    drawPageBorder();
    drawWatermark();

    // pdf.addImage(logo, "PNG", margin, margin + 2, 45, 25);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Techsec NMS – System Report (30 Days Avg)", pageWidth / 2, 22, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    // pdf.text(`Generated: ${generatedAt}`, pageWidth - margin, 22, {
    //   align: "right",
    // });

    /* ================= TABLE CONFIG ================= */

    const tableStartY = 32;
    const rowHeight = 7;
    let y = tableStartY;

    const columnTitles = headers.map((h) => COLUMN_HEADER_MAP[h] || h);
    const columnWidths = columnTitles.map(() =>
      Math.max(35, (pageWidth - margin * 2) / columnTitles.length)
    );

    const startX = margin;

    /* ================= DRAW HEADER ================= */

    const drawHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);

      let x = startX;
      columnTitles.forEach((title, i) => {
        pdf.rect(x, y, columnWidths[i], rowHeight);
        pdf.text(title, x + 2, y + 5);
        x += columnWidths[i];
      });

      y += rowHeight;
      pdf.setFont("helvetica", "normal");
    };

    drawHeader();

    /* ================= DRAW ROWS ================= */

    rows.forEach((row) => {
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage();
        drawPageBorder();
        drawWatermark();
        y = tableStartY;
        drawHeader();
      }

      let x = startX;

      headers.forEach((h, colIdx) => {
        const value = row[h] ?? "-";

        let highlight = false;

        // 🔴 THRESHOLD LOGIC
        if (h === CPU_KEY || h === MEM_KEY) {
          const num = Number(String(value).replace("%", ""));
          if (!Number.isNaN(num) && num > THRESHOLD) {
            highlight = true;
          }
        }

        if (highlight) {
          pdf.setFillColor(255, 204, 204); // light red
          pdf.rect(x, y, columnWidths[colIdx], rowHeight, "F");
        }

        pdf.rect(x, y, columnWidths[colIdx], rowHeight);
        pdf.text(String(value), x + 2, y + 5);

        x += columnWidths[colIdx];
      });

      y += rowHeight;
    });

    pdf.save("Techsec-System-Report.pdf");
  };

  /* ===================== TABLE COLUMNS ===================== */

  const columns = useMemo(() => {
    const fixed = [
      { title: "Host", dataIndex: "Hostname", fixed: "left", width: 200 },
      { title: "Branch", dataIndex: "branch", fixed: "left", width: 220 },
    ];

    const dynamic = headers
      .filter((h) => h !== "Hostname")
      .map((h) => ({
        title: COLUMN_HEADER_MAP[h] || h,
        dataIndex: h,
        align: "center" as const,
        width: 200,
        sorter:
          h === PRIMARY_SENT_KEY
            ? (a: any, b: any) =>
              getTrafficRankValue(b[h]) -
              getTrafficRankValue(a[h])
            : undefined,
        render: (val: any) => {
          if (!val || val === "N/A") return <Tag color="red">N/A</Tag>;

          if (h === CPU_KEY || h === MEM_KEY) {
            const n = getNumber(val);
            return (
              <div
                style={{
                  background: n && n > THRESHOLD ? "#ffccc7" : "transparent",
                  padding: 6,
                  borderRadius: 6,
                }}
              >
                {val}
              </div>
            );
          }

          return val;
        },
      }));

    return [...fixed, ...dynamic];
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
        rowClassName={(r) => ""}
        onRow={(r) => ({
          style: { background: getRowColorBySecondChar(r.Hostname) },
        })}
      />
    </Form>
  );
};

export default SystemReportData;
