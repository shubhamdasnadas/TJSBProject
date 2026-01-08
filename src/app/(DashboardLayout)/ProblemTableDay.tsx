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
  notClassified: "255,179,179",
};

/* --------------------- ROW ORDER (FIXED) --------------------- */
const DAY_ORDER = [
  "0-29 Days",
  "30-59 Days",
  "60-89 Days",
  ">90 Days",
];

/* --------------------- TYPES --------------------- */
type SeverityKey =
  | "disaster"
  | "high"
  | "average"
  | "warning"
  | "information"
  | "notClassified";

export interface ProblemSeverityConfig {
  groupID?: number[];
}

interface Props {
  rangeData: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };
  groupID: number[];
  initialConfig?: ProblemSeverityConfig;
  onConfigChange?: (config: ProblemSeverityConfig) => void;
}

/* --------------------- BASE ROWS (KEY FIX) --------------------- */
const BASE_ROWS = DAY_ORDER.map((day) => ({
  key: day,
  dayRange: day,
  disaster: 0,
  high: 0,
  average: 0,
  warning: 0,
  information: 0,
  notClassified: 0,
}));

/* --------------------- COMPONENT --------------------- */
export default function ProblemTableDay({
  rangeData,
  groupID,
  initialConfig,
  onConfigChange,
}: Props) {
  // ✅ CRITICAL FIX: initialize with rows, NOT empty array
  const [rows, setRows] = useState<any[]>(BASE_ROWS);
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  /* ===================== INIT CONFIG ===================== */
  useEffect(() => {
    if (!initialConfig || initializedRef.current) return;
    initializedRef.current = true;

    onConfigChange?.({
      groupID: initialConfig.groupID ?? groupID,
    });
  }, [initialConfig]);

  /* ===================== LOAD DATA ===================== */
  const load = async () => {
    setLoading(true);

    try {
      if (!user_token) {
        setRows(BASE_ROWS); // never empty
        return;
      }

      const res = await axios.post(
        "/api/zabbix/problems",
        {
          auth: user_token,
          ...rangeData,
          groupids:
            initialConfig?.groupID?.length
              ? initialConfig.groupID
              : groupID,
        }
      );

      const dayRangeData = res.data?.dayRange || {};

      const mergedRows = DAY_ORDER.map((day) => ({
        key: day,
        dayRange: day,
        disaster: dayRangeData[day]?.disaster ?? 0,
        high: dayRangeData[day]?.high ?? 0,
        average: dayRangeData[day]?.average ?? 0,
        warning: dayRangeData[day]?.warning ?? 0,
        information: dayRangeData[day]?.information ?? 0,
        notClassified: dayRangeData[day]?.notClassified ?? 0,
      }));

      setRows(mergedRows);
    } catch (err) {
      console.error("❌ ProblemTableDay fetch error:", err);
      setRows(BASE_ROWS); // fallback rows
    } finally {
      setLoading(false);
    }
  };

  /* ===================== EFFECT ===================== */
  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [rangeData, groupID, initialConfig]);

  /* ===================== TABLE COLUMNS ===================== */
  const columns = [
    {
      title: "Issues age",
      dataIndex: "dayRange",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...([
      "disaster",
      "high",
      "average",
      "warning",
      "information",
      "notClassified",
    ] as SeverityKey[]).map((key) => ({
      title: key
        .replace(/([A-Z])/g, " $1")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      dataIndex: key,
      align: "center" as const,
      render: (value: number) => (
        <div
          style={{
            background: `rgba(${colors[key]}, ${Math.max(
              0.25,
              value / 10
            )})`,
            padding: "6px 0",
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
      rowKey="key"
    />
  );
}
