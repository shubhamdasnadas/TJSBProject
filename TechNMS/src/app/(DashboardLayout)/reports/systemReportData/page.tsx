"use client";

import React, { useMemo, useState } from "react";
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

/* ===================== HELPERS ===================== */

function getNumber(val: any): number | null {
  const n = Number(String(val).replace("%", ""));
  return Number.isNaN(n) ? null : n;
}

function getTrafficRankValue(val: any): number {
  if (!val || val === "N/A") return -1;
  const m = String(val).match(/^([\d.]+)\s*(Kbps|Mbps|Gbps)$/i);
  if (!m) return -1;

  const num = Number(m[1]);
  const unit = m[2].toLowerCase();
  const rank = unit === "kbps" ? 1 : unit === "mbps" ? 2 : 3;
  return rank * 1_000_000_000 + num;
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
  const [headers, setHeaders] = useState<string[]>([]);          // raw keys
  const [displayHeaders, setDisplayHeaders] = useState<string[]>([]); // mapped labels
  const [loading, setLoading] = useState(false);

  const findBranch = (host?: string) => {
    const b = branches.find(
      (x: any) =>
        host?.includes(x.code) ||
        host?.toLowerCase() === x.name.toLowerCase()
    );
    return b ? b.name : "-";
  };

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
        if (status.data.status === "FAILED") throw new Error("Generation failed");

        await new Promise((r) => setTimeout(r, 1500));
      }

      const csvRes = await axios.get("/api/api_system_report_data/readCsv");

      const rawHeaders: string[] = csvRes.data.headers || [];

      setHeaders(rawHeaders);

      // ✅ MAP HEADERS USING COLUMN_HEADER_MAP
      setDisplayHeaders(
        rawHeaders.map((h) => COLUMN_HEADER_MAP[h] || h)
      );

      setRows(
        csvRes.data.rows.map((r: any, i: number) => ({
          key: i,
          Hostname: r.Hostname,
          branch: findBranch(r.Hostname),
          ...r,
        }))
      );

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

    const csvRows = rows.map((r) => headers.map((h) => r[h] ?? "-"));

    const escape = (v: any) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csv = [displayHeaders, ...csvRows]
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

    pdf.setFontSize(14);
    pdf.text(
      "Techsec NMS – System Report (30 Days Avg)",
      pageW / 2,
      20,
      { align: "center" }
    );

    const colW = (pageW - margin * 2) / displayHeaders.length;

    const drawHeader = () => {
      pdf.setFontSize(8);
      let x = margin;
      displayHeaders.forEach((t) => {
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
      headers.forEach((h) => {
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
          title: displayHeaders[headers.indexOf(h)] || h,
          dataIndex: h,
          align: "center" as const,
          sorter:
            h.includes("Bits sent")
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
        })),
    ];
  }, [headers, displayHeaders]);

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
