"use client";

import React, { useEffect, useState, useMemo } from "react";
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

  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [yUnit, setYUnit] = useState<SpeedUnit>("K");

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
      setYUnit(detectedUnit);
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
          };
        })
      );
    };

    if (user_token) fetchData();
  }, [user_token, hosts]);

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
          {
            title: "Speed",
            align: "center",
            render: (_: any, r: RowData) =>
              r.speed !== "-" ? `${r.speed} ${r.unit}` : "-",
          },
          {
            title: "Primary",
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
          {
            title: "Secondary",
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



        {loading ? (
          <Spin />
        ) : chartData.length ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
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

            <Table
              style={{ marginTop: 24 }}
              size="small"
              bordered
              pagination={false}
              rowKey="time"
              columns={historyColumns}
              dataSource={chartData}
            />
          </>
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
