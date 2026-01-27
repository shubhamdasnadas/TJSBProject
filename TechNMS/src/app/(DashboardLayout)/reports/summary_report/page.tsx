"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Table,
  Form,
  Button,
  Modal,
  Typography,
  message,
  DatePicker,
  Spin,
} from "antd";
import axios from "axios";
import useZabbixData from "../../widget/three";
import branches from "../../availability/data/data";
import dayjs, { Dayjs } from "dayjs";

import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

/* ===================== TYPES ===================== */

type GenerateType = "primary" | "secondary";
type SpeedUnit = "K" | "M";

interface RowData {
  key: string;
  host: string;
  hostid: string;
  branch: string;
  speed: number | string;
  unit: string;
  rawSpeed: number | string;
  primarySpeed: number | string;
  secondarySpeed: number | string;
}

interface ChartPoint {
  time: string;
  "Bits Sent"?: number;
  "Bits Received"?: number;
}

/* ===================== ITEM MAP ===================== */

const INTERFACE_ITEM_MAP: Record<GenerateType, string[]> = {
  primary: [
    'Interface ["GigabitEthernet0/0/0"]: Bits sent',
    'Interface ["GigabitEthernet0/0/0"]: Bits received',
  ],
  secondary: [
    'Interface ["GigabitEthernet0/0/1"]: Bits sent',
    'Interface ["GigabitEthernet0/0/1"]: Bits received',
  ],
};

const COLORS = ["#1677ff", "#52c41a"];

/* ===================== COMPONENT ===================== */

const SummaryReport: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const exportCSVRef = useRef<HTMLDivElement>(null);
  const { hosts } = useZabbixData();
  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  const [rows, setRows] = useState<RowData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RowData | null>(null);
  const [generateType, setGenerateType] =
    useState<GenerateType>("primary");
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdftitle, setPdftitle] = useState("")
  const [chartData, setChartData] = useState<ChartPoint[]>([]);


  /* ===================== HELPERS ===================== */

  const findBranch = (hostName?: string) => {
    if (!hostName) return "-";
    const match = branches.find(
      (b: any) =>
        hostName.includes(b.code) ||
        hostName.toLowerCase() === b.name.toLowerCase()
    );
    return match ? match.name : "-";
  };

  /* ===================== REQUIRED LOGIC ===================== */
  const normalizeBitsValue = (value: any) => {
    const bits = Number(value);
    if (isNaN(bits)) return { value, unit: "" };

    const kb = bits / 1000;
    if (kb >= 1000) {
      return { value: Number((kb / 1000).toFixed(2)), unit: " MBPS" as const };
    }
    return { value: Number(kb.toFixed(2)), unit: " kbps" as const };
  };

  // const formatSpeedToMbps = (value: number | string) => {
  //   console.log(value)
  //   const num = Number(value);
  //   if (isNaN(num)) return "-";

  //   // assuming input is in bits per second
  //   const mbps = num / 1_000_000;

  //   return `${mbps.toFixed(2)} MBPS`;
  // };
  /* ===================== OPEN MODAL ===================== */

  const handleGenerateClick = (
    type: GenerateType,
    row: RowData
  ) => {
    setGenerateType(type);
    setSelectedRow(row);
    setRange(null);
    setChartData([]);
    setModalOpen(true);
  };

  /* ===================== FETCH HISTORY ===================== */

  const fetchHistory = async () => {
    if (!selectedRow || !range || !user_token) {
      message.warning("Please select date range");
      return;
    }

    setLoading(true);

    try {
      const itemRes = await axios.post(
        "/api/api_summary_report/get_item_summary",
        {
          auth: user_token,
          hostid: selectedRow.hostid,
          items: INTERFACE_ITEM_MAP[generateType],
        }
      );

      const items = itemRes.data?.result ?? [];
      if (!items.length) {
        message.warning("No items found");
        return;
      }

      const itemNameMap: Record<string, "Bits Sent" | "Bits Received"> = {};
      items.forEach((i: any) => {
        itemNameMap[i.itemid] = i.name.includes("sent")
          ? "Bits Sent"
          : "Bits Received";
      });

      const historyRes = await axios.post(
        "/api/api_summary_report/get_history_summary",
        {
          auth: user_token,
          itemids: items.map((i: any) => i.itemid),
          time_from: range[0].unix(),
          time_till: range[1].unix(),
        }
      );

      const history = historyRes.data?.result ?? [];

      const maxBits = Math.max(...history.map((h: any) => Number(h.value)));
      const detectedUnit = normalizeBitsValue(maxBits).unit as SpeedUnit;

      const grouped: Record<string, ChartPoint> = {};

      history.forEach((h: any) => {
        const time = dayjs
          .unix(Number(h.clock))
          .format("YYYY-MM-DD HH:mm");

        if (!grouped[time]) grouped[time] = { time };

        grouped[time][itemNameMap[h.itemid]] = Number(h.value);
      });

      setChartData(Object.values(grouped));
      // setYUnit(detectedUnit);
      message.success("History loaded");
    } catch (e) {
      console.error(e);
      message.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  /* ===================== SUMMARY TABLE ===================== */

  const summaryData = useMemo(() => {
    const calc = (key: "Bits Sent" | "Bits Received") => {
      const values = chartData
        .map((d) => d[key])
        .filter((v): v is number => typeof v === "number");

      if (!values.length) return { min: "-", avg: "-", max: "-" };

      return {
        min: Math.min(...values).toFixed(2),
        avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        max: Math.max(...values).toFixed(2),
      };
    };

    return {
      received: calc("Bits Received"),
      sent: calc("Bits Sent"),
    };
  }, [chartData]);

  /* ===================== FETCH TABLE ===================== */

  useEffect(() => {
    const fetchData = async () => {
      const res = await axios.post(
        "/api/api_summary_report/get_summary_report",
        {
          auth: user_token,
          groupids: ["210"],
        }
      );

      const data = res.data?.result ?? [];
      setRows(
        data.map((r: any) => {
          const normalized = normalizeBitsValue(r.speed);
          return {
            key: r.hostname,
            host: r.hostname,
            hostid: r.hostid,
            branch: findBranch(r.hostname),
            speed: normalized.value,
            unit: normalized.unit,
            rawSpeed: r.speed,

            // ✅ set both speeds from API result
            primarySpeed: r.primarySpeed ?? "-",
            secondarySpeed: r.secondarySpeed ?? "-",
          };
        })
      );
    };

    if (user_token) fetchData();
  }, [user_token, hosts]);

  const handleExportPDF = async () => {
    if (!selectedRow || !chartData.length) return;

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const logo = "/images/logos/techsec-logo_name.png";
    const generatedAt = dayjs().format("DD/MM/YYYY, h:mm a");
    const margin = 15;

    /* ================= COMMON HELPERS ================= */

    const drawPageBorder = () => {
      pdf.setDrawColor(0);
      pdf.setLineWidth(0.6);
      pdf.rect(
        margin,
        margin,
        pageWidth - margin * 2,
        pageHeight - margin * 2
      );
    };

    // 🔵 MAIN LOGO SIZE (cover)
    const logoWidth = 90;
    const logoHeight = 60;

    // 🔵 DYNAMIC WATERMARK SIZE (relative to page)
    const watermarkWidth = pageWidth * 0.45;
    const watermarkHeight = watermarkWidth * (logoHeight / logoWidth);

    const drawWatermark = (opacity = 0.06) => {
      pdf.setGState(new (pdf as any).GState({ opacity }));
      pdf.addImage(
        logo,
        "PNG",
        pageWidth / 2 - watermarkWidth / 2,
        pageHeight / 2 - watermarkHeight / 2,
        watermarkWidth,
        watermarkHeight
      );
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    };

    /* ================= PAGE 1 – COVER ================= */

    drawPageBorder();

    pdf.addImage(
      logo,
      "PNG",
      pageWidth / 2 - logoWidth / 2,
      margin + 45,
      logoWidth,
      logoHeight
    );

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Techsec NMS – History Report", pageWidth / 2, 135, {
      align: "center",
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(`Host: ${selectedRow.host}`, 40, 160);
    pdf.text(`Branch: ${selectedRow.branch}`, 40, 170);

    pdf.setFont("helvetica", "bold");
    pdf.text("Item Name:", 40, 185);

    pdf.setFont("helvetica", "normal");
    INTERFACE_ITEM_MAP[generateType].forEach((item, idx) => {
      pdf.text(`• ${item}`, 45, 195 + idx * 8);
    });

    pdf.setFontSize(9);
    pdf.text(`Generated: ${generatedAt}`, pageWidth - 20, 25, {
      align: "right",
    });

    /* ================= PAGE 2 – GRAPH + SUMMARY ================= */

    pdf.addPage();
    drawPageBorder();
    drawWatermark(0.08);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Utilization Graph", 30, 30);

    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current, { scale: 2 });
      const img = canvas.toDataURL("image/png");
      pdf.addImage(img, "PNG", 25, 40, pageWidth - 50, 80);
    }

    pdf.setFontSize(13);
    pdf.text("Summary", 30, 135);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    pdf.text(`Bits Received  Min: ${summaryData.received.min}`, 30, 150);
    pdf.text(`Avg: ${summaryData.received.avg}`, 90, 150);
    pdf.text(`Max: ${summaryData.received.max}`, 140, 150);

    pdf.text(`Bits Sent       Min: ${summaryData.sent.min}`, 30, 160);
    pdf.text(`Avg: ${summaryData.sent.avg}`, 90, 160);
    pdf.text(`Max: ${summaryData.sent.max}`, 140, 160);

    /* ================= PAGE 3 – HISTORY TABLE ================= */

    pdf.addPage();
    drawPageBorder();
    drawWatermark(0.05);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("History Data", 30, 30);

    const tableStartX = 30;
    const tableTop = 40;
    const rowHeight = 7;

    const colW = { time: 70, recv: 45, sent: 45 };
    const colX = {
      time: tableStartX,
      recv: tableStartX + colW.time,
      sent: tableStartX + colW.time + colW.recv,
    };

    let y = tableTop;

    const drawHeader = () => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);

      pdf.rect(colX.time, y, colW.time, rowHeight);
      pdf.rect(colX.recv, y, colW.recv, rowHeight);
      pdf.rect(colX.sent, y, colW.sent, rowHeight);

      pdf.text("Time", colX.time + 2, y + 5);
      pdf.text("Bits Received", colX.recv + 2, y + 5);
      pdf.text("Bits Sent", colX.sent + 2, y + 5);

      y += rowHeight;
      pdf.setFont("helvetica", "normal");
    };

    drawHeader();

    chartData.forEach((r) => {
      if (y + rowHeight > pageHeight - 20) {
        pdf.addPage();
        drawPageBorder();
        drawWatermark(0.05);
        y = tableTop;
        drawHeader();
      }

      const recv =
        r["Bits Received"] !== undefined
          ? `${normalizeBitsValue(r["Bits Received"]).value}${normalizeBitsValue(r["Bits Received"]).unit}`
          : "-";

      const sent =
        r["Bits Sent"] !== undefined
          ? `${normalizeBitsValue(r["Bits Sent"]).value}${normalizeBitsValue(r["Bits Sent"]).unit}`
          : "-";

      pdf.rect(colX.time, y, colW.time, rowHeight);
      pdf.rect(colX.recv, y, colW.recv, rowHeight);
      pdf.rect(colX.sent, y, colW.sent, rowHeight);

      pdf.text(r.time, colX.time + 2, y + 5);
      pdf.text(recv, colX.recv + 2, y + 5);
      pdf.text(sent, colX.sent + 2, y + 5);

      y += rowHeight;
    });

    pdf.save("Techsec-History-Report.pdf");
  };


  const handleExportCSV = () => {
    if (!chartData.length) return;

    const headers = ["Time", "Bits Received", "Bits Sent"];

    const rows = chartData.map((r) => {
      const bitsReceived =
        r["Bits Received"] !== undefined
          ? `${normalizeBitsValue(r["Bits Received"]).value}${normalizeBitsValue(
            r["Bits Received"]
          ).unit}`
          : "-";

      const bitsSent =
        r["Bits Sent"] !== undefined
          ? `${normalizeBitsValue(r["Bits Sent"]).value}${normalizeBitsValue(
            r["Bits Sent"]
          ).unit}`
          : "-";

      return [r.time, bitsReceived, bitsSent];
    });

    // ✅ escape CSV values safely
    const escapeCSV = (value: any) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "history-table.csv";
    link.click();

    URL.revokeObjectURL(link.href);
  };

  <style jsx global>{`
  @keyframes pulseGlowOrange {
    0% {
      box-shadow: 0 0 0 0 rgba(255, 122, 69, 0.6);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(255, 122, 69, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(255, 122, 69, 0);
    }
  }
`}</style>



  /* ===================== MODAL TABLE COLUMNS ===================== */

  const historyColumns = [
    {
      title: "Time",
      dataIndex: "time",
    },
    {
      title: "Bits Received",
      render: (_: any, r: ChartPoint) => {
        if (r["Bits Received"] === undefined) return "-";
        const { value, unit } = normalizeBitsValue(r["Bits Received"]);
        return `${value}${unit}`;
      },
    },
    {
      title: "Bits Sent",
      render: (_: any, r: ChartPoint) => {
        if (r["Bits Sent"] === undefined) return "-";
        const { value, unit } = normalizeBitsValue(r["Bits Sent"]);
        return `${value}${unit}`;
      },
    },
  ];

  /* ===================== UI ===================== */

  return (
    <Form layout="vertical">
      <Title level={4}>System Report – Speed</Title>

      <Table
        bordered
        size="middle"
        pagination={false}
        rowKey="key"
        columns={[
          {
            title: "Host",
            dataIndex: "host",
            render: (v: string) => (
              <Text strong style={{ color: "#1677ff" }}>{v}</Text>
            ),
          },
          { title: "Branch", dataIndex: "branch" },

          // ✅ PRIMARY GROUP COLUMN
          {
            title: "Primary",
            children: [
              {
                title: "Speed",
                align: "center",
                render: (_: any, r: RowData) =>
                  r.primarySpeed !== "-" ? r.primarySpeed + " Mbps" : "-",
              },
              {
                title: "Utilization",
                align: "center",
                render: (_: any, row: RowData) => (
                  <Button
                    size="middle"
                    onClick={() => handleGenerateClick("primary", row)}
                    style={{
                      background: "linear-gradient(135deg, #ffa940, #ff7a45)",
                      border: "none",
                      color: "#000",
                      fontWeight: 600,
                      padding: "6px 18px",
                      borderRadius: "6px",
                      boxShadow: "0 0 0 rgba(255,122,69,0.6)",
                      animation: "pulseGlowOrange 1.8s infinite",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.boxShadow =
                        "0 0 14px rgba(255,122,69,0.9)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 rgba(255,122,69,0.6)";
                    }}
                  >
                    Generate
                  </Button>
                ),
              },
            ],
          },

          // ✅ SECONDARY GROUP COLUMN
          {
            title: "Secondary",
            children: [
              {
                title: "Speed",
                align: "center",
                render: (_: any, r: RowData) =>
                  r.secondarySpeed !== "-" ? r.secondarySpeed + " Mbps" : "-",
              },
              {
                title: "Utilization",
                align: "center",
                render: (_: any, row: RowData) => (
                  <Button
                    size="middle"
                    onClick={() => handleGenerateClick("secondary", row)}
                    style={{
                      background: "linear-gradient(135deg, #ffa940, #ff7a45)",
                      border: "none",
                      color: "#000",
                      fontWeight: 600,
                      padding: "6px 18px",
                      borderRadius: "6px",
                      boxShadow: "0 0 0 rgba(255,122,69,0.6)",
                      animation: "pulseGlowOrange 1.8s infinite",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.boxShadow =
                        "0 0 14px rgba(255,122,69,0.9)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.boxShadow =
                        "0 0 0 rgba(255,122,69,0.6)";
                    }}
                  >
                    Generate
                  </Button>
                ),
              },
            ],
          },
        ]}

        dataSource={rows}
      />

      <Modal
        title="Generate Report"
        open={modalOpen}
        width={900}
        onCancel={() => setModalOpen(false)}
        onOk={fetchHistory}
        okText="Fetch History"
        confirmLoading={loading}
        destroyOnClose
      >
        <RangePicker
          showTime
          style={{ width: "100%", marginBottom: 24 }}
          onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
          <Button onClick={handleExportCSV}>Export CSV</Button>
          <Button type="primary" onClick={handleExportPDF}>
            Export PDF
          </Button>
        </div>


        {loading ? (
          <Spin />
        ) : chartData.length ? (
          <div >
            <ResponsiveContainer width="100%" height={300} ref={chartRef}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis
                  tickFormatter={(v) => {
                    const { value, unit } = normalizeBitsValue(v);
                    return `${value}${unit}`;
                  }}
                />
                <YAxis
                  tickFormatter={(v) => {
                    const { value, unit } = normalizeBitsValue(v);
                    return `${value}${unit}`;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Bits Received"
                  stroke={COLORS[0]}
                  fill={COLORS[0]}
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="Bits Sent"
                  stroke={COLORS[1]}
                  fill={COLORS[1]}
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>

            <Table
              style={{ marginTop: 16 }}
              size="small"
              bordered
              pagination={false}
              showHeader
              dataSource={[
                {
                  key: "received",
                  item: `${selectedRow?.host} : Bits received`,
                  min: summaryData.received.min,
                  avg: summaryData.received.avg,
                  max: summaryData.received.max,
                },
                {
                  key: "sent",
                  item: `${selectedRow?.host} : Bits sent`,
                  min: summaryData.sent.min,
                  avg: summaryData.sent.avg,
                  max: summaryData.sent.max,
                },
              ]}
              columns={[
                {
                  title: "",
                  dataIndex: "item",
                  render: (v: string, r: any) => (
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: r.key === "received" ? "#1677ff" : "#52c41a",
                      }}
                    >
                      ■ {v}
                    </Text>
                  ),
                },
                {
                  title: "min",
                  align: "right",
                  render: (_: any, r: any) => {
                    const { value, unit } = normalizeBitsValue(r.min);
                    return <Text>{value}{unit}</Text>;
                  }
                },
                {
                  title: "avg",
                  align: "right",
                  render: (_: any, r: any) => {
                    const { value, unit } = normalizeBitsValue(r.avg);
                    return <Text>{value}{unit}</Text>;
                  }
                },
                {
                  title: "max",
                  align: "right",
                  render: (_: any, r: any) => {
                    const { value, unit } = normalizeBitsValue(r.max);
                    return <Text>{value}{unit}</Text>;
                  }
                },
              ]}
            />
            <div>

              <Table
                style={{ marginTop: 24 }}
                size="small"
                bordered
                pagination={false}
                rowKey="time"
                columns={historyColumns}
                dataSource={chartData}
              />

            </div>
          </div>
        ) : (
          <Text type="secondary">
            Select date range and click Fetch History
          </Text>
        )}
      </Modal>
    </Form>
  );
};

export default SummaryReport;
