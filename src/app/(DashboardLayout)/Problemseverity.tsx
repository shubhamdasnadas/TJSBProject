"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Table, Typography } from "antd";

const { Text } = Typography;

/* --------------------- COLOR MAP --------------------- */
const colors: Record<string, string> = {
  disaster: "144,238,144",
  high: "211,211,211",
  average: "255,204,128",
  warning: "255,245,157",
  information: "173,216,230",
  not_classified: "255,179,179",
};

/* --------------------- STRICT SEVERITY TYPE --------------------- */
type SeverityKey =
  | "disaster"
  | "high"
  | "average"
  | "warning"
  | "information"
  | "not_classified";

/* --------------------- PROPS --------------------- */
interface Props {
  rangeData: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };
  groupID: number[];
}

/* --------------------- MAIN COMPONENT --------------------- */
export default function ProblemSeverity({ rangeData, groupID }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  /* ===================== DEFAULT LAST 1 DAY ===================== */
  const getDefaultLastOneDayRange = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const pad = (n: number) => String(n).padStart(2, "0");

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const formatTime = (d: Date) =>
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

    return {
      startDate: formatDate(oneDayAgo),
      startTime: formatTime(oneDayAgo),
      endDate: formatDate(now),
      endTime: formatTime(now),
    };
  };

  /* ===================== LOAD DATA ===================== */
  const load = async () => {
    setLoading(true);

    try {
      if (!token) return;

      const isRangeEmpty =
        !rangeData?.startDate &&
        !rangeData?.startTime &&
        !rangeData?.endDate &&
        !rangeData?.endTime;

      const finalRangeData = isRangeEmpty
        ? getDefaultLastOneDayRange()
        : rangeData;

      const res = await axios.post(
        "http://192.168.56.1:3000/api/zabbix/problems",
        {
          auth: token,
          ...finalRangeData,
          groupids: groupID,
        }
      );

      /* ===================== HOST GROUP DATA ===================== */
      const countsByGroup: Record<
        string,
        Record<SeverityKey, number>
      > = res.data?.countsByGroup || {};

      const formattedRows = Object.entries(countsByGroup).map(
        ([groupName, counts]) => ({
          key: groupName,
          host: groupName, // ✅ HOST COLUMN = HOST GROUP NAME
          ...counts,
        })
      );

      setRows(formattedRows);
    } catch (err) {
      console.error("❌ ProblemSeverity fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== EFFECT ===================== */
  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [rangeData, groupID]);

  /* ===================== TABLE COLUMNS ===================== */
  const columns = [
    {
      title: "Host Group",
      dataIndex: "host",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...([
      "disaster",
      "high",
      "average",
      "warning",
      "information",
      "not_classified",
    ] as SeverityKey[]).map((key) => ({
      title: key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      dataIndex: key,
      render: (value: number) => (
        <div
          style={{
            background: `rgba(${colors[key]}, ${Math.max(
              0.25,
              value / 10
            )})`,
            padding: "6px 0",
            textAlign: "center",
            borderRadius: 4,
            fontWeight: 600,
          }}
        >
          {value}
        </div>
      ),
    })),
  ];

  /* ===================== UI ===================== */
  return (
    <Table
      columns={columns}
      dataSource={rows}
      loading={loading}
      pagination={false}
      bordered
      size="small"
      style={{ marginTop: 20 }}
      rowKey="host"
    />
  );
}
