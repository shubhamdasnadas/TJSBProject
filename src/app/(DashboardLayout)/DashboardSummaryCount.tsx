"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, Typography, Row, Col } from "antd";
import axios from "axios";

const { Text, Title } = Typography;

/* ===================== ANIMATION HOOK ===================== */
function useAnimatedNumber(value: number, duration = 800) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prev = useRef<number>(value);

  useEffect(() => {
    if (prev.current === value) return;
    if (typeof window === "undefined") return;

    const start = prev.current;
    const end = value;
    const startTime = window.performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplayValue(Math.floor(start + (end - start) * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    prev.current = value;
  }, [value, duration]);

  return displayValue;
}

/* ===================== METRIC CARD ===================== */
interface MetricCardProps {
  value: number;
  footer: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ value, footer, color }) => {
  const animatedValue = useAnimatedNumber(value);

  return (
    <Card
      style={{
        borderRadius: 14,
        width: "100%",
        height: 150,
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div style={{ padding: "16px 12px" }}>
        <Title level={3} style={{ marginBottom: 6, fontWeight: 600 }}>
          {animatedValue}
        </Title>
        <Text style={{ fontSize: 15, fontWeight: 500 }}>{footer}</Text>
      </div>
    </Card>
  );
};

/* ===================== MAIN COMPONENT ===================== */
interface DashboardSummaryCountProps {
  rangeData: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };
  groupID: number[];
}

type SeverityKey =
  | "disaster"
  | "high"
  | "average"
  | "warning"
  | "information"
  | "not_classified";

export default function DashboardSummaryCount({
  rangeData,
  groupID,
}: DashboardSummaryCountProps) {
  const [counts, setCounts] = useState<Record<SeverityKey, number>>({
    disaster: 0,
    high: 0,
    average: 0,
    warning: 0,
    information: 0,
    not_classified: 0,
  });

  /* ===================== DEFAULT LAST 1 DAY RANGE ===================== */
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

  /* ===================== API CALL ===================== */
  const fetchCounts = async () => {
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("zabbix_auth")
          : null;

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

      /* ===================== SUM ALL GROUP COUNTS ===================== */
      const countsByGroup = res.data?.countsByGroup || {};

      const totalCounts: Record<SeverityKey, number> = {
        disaster: 0,
        high: 0,
        average: 0,
        warning: 0,
        information: 0,
        not_classified: 0,
      };

      Object.values(countsByGroup).forEach((group: any) => {
        (Object.keys(totalCounts) as SeverityKey[]).forEach((key) => {
          totalCounts[key] += Number(group[key] || 0);
        });
      });

      setCounts(totalCounts);
    } catch (err) {
      console.error("❌ Error fetching counts:", err);
    }
  };

  /* ===================== EFFECT ===================== */
  useEffect(() => {
    fetchCounts();
  }, [rangeData, groupID]);

  /* ===================== METRICS ===================== */
  const metrics: MetricCardProps[] = [
    { value: counts.disaster, footer: "Disaster", color: "var(--card-disaster)" },
    { value: counts.high, footer: "High", color: "var(--card-high)" },
    { value: counts.average, footer: "Average", color: "var(--card-average)" },
    { value: counts.warning, footer: "Warning", color: "var(--card-warning)" },
    { value: counts.information, footer: "Information", color: "var(--card-info)" },

  ];

  /* ===================== UI ===================== */
  return (
    <div style={{ width: "100%" }}>
      <Row gutter={18} justify="center" align="middle" style={{ marginTop: 20 }}>
        {metrics.map((metric, index) => (
          <Col key={index} xs={24} sm={12} md={8} lg={4} xl={4}>
            <MetricCard {...metric} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
