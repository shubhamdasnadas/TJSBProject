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

/* --------------------- PRIORITY MAP --------------------- */
const priorityMap: Record<number, SeverityKey> = {
  5: "disaster",
  4: "high",
  3: "average",
  2: "warning",
  1: "information",
};

/* --------------------- TYPES --------------------- */
interface HostItem {
  name: string;
}

interface EventItem {
  severity: number;
  hosts?: HostItem[];
}

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

  const load = async () => {
    setLoading(true);

    try {
      const res = await axios.post(
        "http://192.168.56.1:3000/api/zabbix/problems",
        {
          auth: token,
          ...rangeData,
          groupids: groupID,
        }
      );

      const events: EventItem[] = Array.isArray(res.data?.events)
        ? res.data.events
        : [];

      /* ---------- FIX: Strongly typed map ---------- */
      const map: Record<string, Record<SeverityKey, number>> = {};

      events.forEach((ev) => {
        const sevKey: SeverityKey =
          priorityMap[ev.severity] || "not_classified";

        (ev.hosts || []).forEach((host) => {
          const name = host.name || "Unknown Host";

          if (!map[name]) {
            map[name] = {
              disaster: 0,
              high: 0,
              average: 0,
              warning: 0,
              information: 0,
              not_classified: 0,
            };
          }

          map[name][sevKey] += 1; // ✅ ERROR FIXED
        });
      });

      const formattedRows = Object.entries(map).map(([host, counts]) => ({
        key: host,
        host,
        ...counts,
      }));

      setRows(formattedRows);
    } catch (err) {
      console.error("❌ ProblemSeverity fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* --------------------- EFFECT --------------------- */
  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [rangeData, groupID]);

  /* --------------------- TABLE COLUMNS --------------------- */
  const columns = [
    {
      title: "Host",
      dataIndex: "host",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    ...[
      "disaster",
      "high",
      "average",
      "warning",
      "information",
      "not_classified",
    ].map((key) => ({
      title: key.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      dataIndex: key,
      render: (value: number) => (
        <div
          style={{
            background: `rgba(${colors[key]}, ${Math.max(0.25, value / 10)})`,
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
