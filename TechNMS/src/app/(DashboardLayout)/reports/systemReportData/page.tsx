"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, Form, Table, Typography, Tag, Button, Dropdown, message } from "antd";
import type { MenuProps } from "antd";
import axios from "axios";
import branches from "../../availability/data/data";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

const { Title, Text } = Typography;

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
const PRIMARY_SENT_KEY = 'Interface ["GigabitEthernet0/0/0"]: Bits sent';

function getNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  if (!str || str === "N/A") return null;

  const num = Number(str);
  if (Number.isNaN(num)) return null;
  return num;
}

function getTrafficRankValue(val: any): number {
  if (!val || val === "N/A") return -1;
  const str = String(val).trim();

  const match = str.match(/^([\d.]+)\s*(Kbps|Mbps|Gbps)$/i);
  if (!match) return -1;

  const num = Number(match[1]);
  if (Number.isNaN(num)) return -1;

  const unit = match[2].toLowerCase();

  let unitRank = 0;
  if (unit === "kbps") unitRank = 1;
  if (unit === "mbps") unitRank = 2;
  if (unit === "gbps") unitRank = 3;

  return unitRank * 1_000_000_000 + num;
}

/**
 * ✅ Row bg/text color based on 2nd alphabet of Hostname
 * Example: BR-C002-MAIN => "R" is 2nd char of "BR..."
 */
function getRowColorBySecondChar(hostname?: string) {
  const name = String(hostname || "").trim();
  const second = name.length >= 2 ? name[1].toUpperCase() : "X";

  const palette: Record<
    string,
    { background: string; color: string; borderLeft: string }
  > = {
    A: { background: "#fff7e6", color: "#ad4e00", borderLeft: "4px solid #fa8c16" },
    B: { background: "#e6f7ff", color: "#0050b3", borderLeft: "4px solid #1890ff" },
    C: { background: "#f6ffed", color: "#237804", borderLeft: "4px solid #52c41a" },
    D: { background: "#fff0f6", color: "#c41d7f", borderLeft: "4px solid #eb2f96" },
    E: { background: "#f9f0ff", color: "#531dab", borderLeft: "4px solid #722ed1" },
    F: { background: "#f0f5ff", color: "#10239e", borderLeft: "4px solid #2f54eb" },
    G: { background: "#fff1f0", color: "#a8071a", borderLeft: "4px solid #f5222d" },
    H: { background: "#fafafa", color: "#262626", borderLeft: "4px solid #8c8c8c" },
    I: { background: "#e6fffb", color: "#006d75", borderLeft: "4px solid #13c2c2" },
    J: { background: "#fcffe6", color: "#5b8c00", borderLeft: "4px solid #a0d911" },
    K: { background: "#fffbe6", color: "#ad6800", borderLeft: "4px solid #faad14" },
    L: { background: "#f0f5ff", color: "#1d39c4", borderLeft: "4px solid #597ef7" },
    M: { background: "#f6ffed", color: "#135200", borderLeft: "4px solid #73d13d" },
    N: { background: "#fff0f6", color: "#9e1068", borderLeft: "4px solid #f759ab" },
    O: { background: "#e6f7ff", color: "#003a8c", borderLeft: "4px solid #40a9ff" },
    P: { background: "#fff7e6", color: "#873800", borderLeft: "4px solid #ffa940" },
    Q: { background: "#f9f0ff", color: "#391085", borderLeft: "4px solid #9254de" },
    R: { background: "#fff1f0", color: "#820014", borderLeft: "4px solid #ff4d4f" },
    S: { background: "#e6fffb", color: "#00474f", borderLeft: "4px solid #36cfc9" },
    T: { background: "#f0f5ff", color: "#061178", borderLeft: "4px solid #1d39c4" },
    U: { background: "#f6ffed", color: "#274916", borderLeft: "4px solid #95de64" },
    V: { background: "#fff7e6", color: "#613400", borderLeft: "4px solid #ff7a45" },
    W: { background: "#fffbe6", color: "#7c5914", borderLeft: "4px solid #ffc53d" },
    X: { background: "#fafafa", color: "#262626", borderLeft: "4px solid #d9d9d9" },
    Y: { background: "#e6f7ff", color: "#002766", borderLeft: "4px solid #096dd9" },
    Z: { background: "#f9f0ff", color: "#120338", borderLeft: "4px solid #b37feb" },
  };

  return palette[second] || palette["X"];
}

const SystemReportData: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string>("");

  // ✅ for PDF screenshot export
  const tableWrapRef = useRef<HTMLDivElement | null>(null);

  const findBranch = (hostName?: string) => {
    if (!hostName) return "-";
    const match =
      branches.find(
        (b: any) =>
          hostName.includes(b.code) ||
          hostName.toLowerCase() === b.name.toLowerCase()
      ) ?? null;
    return match ? match.name : "-";
  };

  useEffect(() => {
    const fetchCsvTable = async () => {
      try {
        setLoading(true);

        const res = await axios.get("/api/api_system_report_data/readCsv");
        const data = res.data;

        const csvHeaders: string[] = data?.headers ?? [];
        const csvRows: any[] = data?.rows ?? [];

        setFileName(data?.fileName ?? "");
        setHeaders(csvHeaders);

        setRows(
          csvRows.map((r: any, idx: number) => ({
            key: `${r?.Hostname || "row"}_${idx}`,
            Hostname: r?.Hostname ?? "-",
            branch: findBranch(r?.Hostname),
            ...r,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCsvTable();
  }, []);

  const columns = useMemo(() => {
    const fixedColumns = [
      {
        title: "Host",
        dataIndex: "Hostname",
        key: "Hostname",
        fixed: "left" as const,
        width: 200,
      },
      {
        title: "Branch",
        dataIndex: "branch",
        key: "branch",
        fixed: "left" as const,
        width: 220,
      },
    ];

    const dynamicCols = headers
      .filter((h) => h !== "Hostname")
      .map((h) => {
        const isCpu = h === CPU_KEY;
        const isMem = h === MEM_KEY;
        const isPrimarySent = h === PRIMARY_SENT_KEY;

        return {
          title: COLUMN_HEADER_MAP[h] || h,
          dataIndex: h,
          key: h,
          align: "center" as const,
          width: 200,

          ...(isPrimarySent
            ? {
                sorter: (a: any, b: any) => {
                  const av = getTrafficRankValue(a[PRIMARY_SENT_KEY]);
                  const bv = getTrafficRankValue(b[PRIMARY_SENT_KEY]);
                  return bv - av;
                },
                defaultSortOrder: "descend" as const,
                sortDirections: ["descend", "ascend"] as any,
              }
            : {}),

          render: (val: any) => {
            if (!val || val === "N/A") return <Tag color="red">N/A</Tag>;

            if (isCpu || isMem) {
              const n = getNumber(val);
              const isHigh = typeof n === "number" && n > THRESHOLD;

              return (
                <div
                  style={{
                    background: isHigh ? "#ffcccc" : "transparent",
                    padding: "6px 8px",
                    borderRadius: 6,
                    fontWeight: isHigh ? 600 : 400,
                  }}
                >
                  <Text>{val}</Text>
                </div>
              );
            }

            return <Text>{val}</Text>;
          },
        };
      });

    return [...fixedColumns, ...dynamicCols];
  }, [headers]);

  // ✅ Excel Export (Full table)
  const exportToExcel = () => {
    try {
      if (!rows.length) {
        message.warning("No data to export");
        return;
      }

      const exportHeaders = ["Hostname", "branch", ...headers.filter((h) => h !== "Hostname")];

      const sheetRows = rows.map((r) => {
        const obj: Record<string, any> = {};
        for (const h of exportHeaders) {
          obj[COLUMN_HEADER_MAP[h] || h] = r[h] ?? "N/A";
        }
        return obj;
      });

      const ws = XLSX.utils.json_to_sheet(sheetRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "System Report");

      const file = `System_Report_${Date.now()}.xlsx`;
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, file);
      message.success("Excel exported successfully");
    } catch (e) {
      console.error(e);
      message.error("Excel export failed");
    }
  };

  // ✅ PDF Export (Full Table by Screenshot - like your 3rd image)
  const exportToPDF = async () => {
    try {
      if (!tableWrapRef.current) {
        message.error("Table not found");
        return;
      }

      message.loading({ content: "Generating PDF...", key: "pdf" });

      const canvas = await html2canvas(tableWrapRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("l", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`System_Report_${Date.now()}.pdf`);

      message.success({ content: "PDF exported successfully", key: "pdf" });
    } catch (e) {
      console.error(e);
      message.error({ content: "PDF export failed", key: "pdf" });
    }
  };

  const exportMenuItems: MenuProps["items"] = [
    { key: "excel", label: "Export Excel (.xlsx)" },
    { key: "pdf", label: "Export PDF (.pdf)" },
  ];

  const onExportMenuClick: MenuProps["onClick"] = async ({ key }) => {
    if (key === "excel") exportToExcel();
    if (key === "pdf") await exportToPDF();
  };

  return (
    <Form layout="vertical">
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              System Report – 30 Days Average
            </Title>
            {fileName ? (
              <Text type="secondary">Latest File: {fileName}</Text>
            ) : (
              <Text type="secondary">No CSV loaded</Text>
            )}
          </div>

          <Dropdown menu={{ items: exportMenuItems, onClick: onExportMenuClick }} placement="bottomRight">
            <Button type="primary" style={{ width: 160 }}>
              Export
            </Button>
          </Dropdown>
        </div>
      </Card>

      {/* ✅ Export PDF capture area */}
      <div ref={tableWrapRef}>
        <Table
          loading={loading}
          bordered
          size="middle"
          pagination={{ pageSize: 20 }}
          scroll={{ x: "max-content" }}
          dataSource={rows}
          columns={columns as any}
          rowClassName={(record: any) => {
            // just for custom styles if needed
            return "";
          }}
          onRow={(record: any) => {
            const { background, color, borderLeft } = getRowColorBySecondChar(record?.Hostname);
            return {
              style: {
                background,
                color,
                borderLeft,
              },
            };
          }}
        />
      </div>
    </Form>
  );
};

export default SystemReportData;
