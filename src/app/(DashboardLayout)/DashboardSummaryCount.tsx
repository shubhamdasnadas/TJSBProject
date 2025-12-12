"use client";

import { Card, Typography, Row, Col } from "antd";
import axios from "axios";
import { useEffect, useState, useRef } from "react";

const { Text, Title } = Typography;

/* -------------------- ANIMATION HOOK -------------------- */
function useAnimatedNumber(value: number, duration = 800) {
  const [displayValue, setDisplayValue] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;

    const start = prev.current;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplayValue(Math.floor(start + (end - start) * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    prev.current = value;
  }, [value]);

  return displayValue;
}

/* -------------------- METRIC CARD -------------------- */
interface MetricCardProps {
  value: number;
  footer: string;
  color: string;
}

const MetricCard = ({ value, footer, color }: MetricCardProps) => {
  const animatedValue = useAnimatedNumber(value);

  return (
    <Card
      style={{
        borderRadius: 10,
        width: 220,
        height: 150,
        display: "flex",
        justifyContent: "center",
        background: color,
        textAlign: "center",
      }}
      bodyStyle={{
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Title level={3} style={{ marginBottom: 6 }}>
        {animatedValue}
      </Title>
      <Text>{footer}</Text>
    </Card>
  );
};

/* -------------------- MAIN COMPONENT -------------------- */
export default function DashboardSummaryCount({
  rangeData,
  groupID,
}: {
  rangeData: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };
  groupID: number[];
}) {
  const [counts, setCounts] = useState({
    disaster: 0,
    high: 0,
    average: 0,
    warning: 0,
    information: 0,
    not_classified: 0,
  });

  const fetchCounts = async () => {
    const token = localStorage.getItem("zabbix_auth");

    try {
      const res = await axios.post(
        "http://192.168.56.1:3000/api/zabbix/problems",
        {
          auth: token,
          ...rangeData,
          groupids: groupID,
        }
      );

      // Backend returns { counts, events }
      if (res.data?.counts) {
        setCounts(res.data.counts);
      }
    } catch (err) {
      console.error("❌ Error fetching counts:", err);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, [rangeData, groupID]);

  const metrics: MetricCardProps[] = [
    { value: counts.disaster, footer: "Disaster", color: "var(--card-disaster)" },
    { value: counts.high, footer: "High", color: "var(--card-high)" },
    { value: counts.average, footer: "Average", color: "var(--card-average)" },
    { value: counts.warning, footer: "Warning", color: "var(--card-warning)" },
    { value: counts.information, footer: "Information", color: "var(--card-info)" },
    {
      value: counts.not_classified,
      footer: "Not classified",
      color: "var(--card-grey)",
    },
  ];

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 20 }}>
      <Row gutter={[16, 16]} wrap={false}>
        {metrics.map((metric, index) => (
          <Col key={index}>
            <MetricCard {...metric} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
