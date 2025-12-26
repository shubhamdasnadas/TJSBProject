"use client";

import axios from "axios";
import { useEffect, useRef, useState } from "react";
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

/* --------------------- CONFIG TYPE (ADDED) --------------------- */
export interface ProblemSeverityConfig {
  groupID?: number[];
}

/* --------------------- PROPS --------------------- */
interface Props {
  rangeData: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };
  groupID: number[];

  /* ✅ ADDED (NON-BREAKING) */
  initialConfig?: ProblemSeverityConfig;
  onConfigChange?: (config: ProblemSeverityConfig) => void;
}

/* --------------------- MAIN COMPONENT --------------------- */
export default function ProblemSeverity({
  rangeData,
  groupID,
  initialConfig,
  onConfigChange,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const initializedRef = useRef(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  /* ===================== INIT CONFIG (VIEW MODE) ===================== */
  useEffect(() => {
    if (!initialConfig) return;
    if (initializedRef.current) return;

    initializedRef.current = true;

    // Emit config once so parent stores it
    if (onConfigChange) {
      onConfigChange({
        groupID: initialConfig.groupID ?? groupID,
      });
    }
  }, [initialConfig]);

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

  /* ===================== LOAD DATA (UNCHANGED CORE LOGIC) ===================== */
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

      // ✅ groupID priority:
      // 1. initialConfig
      // 2. prop groupID (existing behavior)
      const finalGroupIDs =
        initialConfig?.groupID && initialConfig.groupID.length > 0
          ? initialConfig.groupID
          : groupID;

      const res = await axios.post(
        "/api/zabbix/problems",
        {
          auth: token,
          ...finalRangeData,
          groupids: finalGroupIDs,
        }
      );

      const countsByGroup: Record<
        string,
        Record<SeverityKey, number>
      > = res.data?.countsByGroup || {};

      const formattedRows = Object.entries(countsByGroup).map(
        ([groupName, counts]) => ({
          key: groupName,
          host: groupName,
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

  /* ===================== EFFECT (UNCHANGED) ===================== */
  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [rangeData, groupID, initialConfig]);

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

  /* ===================== UI (UNCHANGED) ===================== */
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
