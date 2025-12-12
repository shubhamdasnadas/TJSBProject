"use client";

import { Card, Typography, Row, Col } from "antd";
import axios from "axios";
import { useEffect, useState, useRef } from "react";

const { Text, Title } = Typography;

/* -------------------- COUNT ANIMATION HOOK -------------------- */
function useAnimatedNumber(value: number, duration = 800) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;

    const start = previousValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      setDisplayValue(current);

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
    previousValue.current = value;
  }, [value, duration]);

  return displayValue;
}

/* -------------------- CARD COMPONENT -------------------- */

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
        padding: 0,
        width: "220px",
        height: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: color,
      }}
      bodyStyle={{
        padding: "10px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div>
        <Title level={3} style={{ fontWeight: 700, fontSize: "26px", marginBottom: 6 }}>
          {animatedValue}
        </Title>
        <Text style={{ fontSize: "14px", fontWeight: 500 }}>{footer}</Text>
      </div>
    </Card>
  );
};

/* -------------------- MAIN COMPONENT -------------------- */

interface RangeDataProps {
  rangeData: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  };
}

export default function DashboardSummaryCount({ rangeData }: RangeDataProps) {
  const [counts, setCounts] = useState({
    disaster: 0,
    high: 0,
    average: 0,
    warning: 0,
    information: 0,
    not_classified: 0,
  });

  const fetchData = async () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : "";

    try {
      const res = await axios.post("http://192.168.56.1:3000/api/zabbix/problems", {
        auth: token,
        ...rangeData,
      });

      if (!Array.isArray(res.data.result)) return;

      const triggers = res.data.result;
      const newCounts = {
        disaster: 0,
        high: 0,
        average: 0,
        warning: 0,
        information: 0,
        not_classified: 0,
      };

      triggers.forEach((trigger: any) => {
        switch (String(trigger.priority)) {
          case "5": newCounts.disaster++; break;
          case "4": newCounts.high++; break;
          case "3": newCounts.average++; break;
          case "2": newCounts.warning++; break;
          case "1": newCounts.information++; break;
          default: newCounts.not_classified++;
        }
      });

      setCounts(newCounts);
    } catch (err) {
      console.error("API fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [rangeData]);

  const metrics = [
    { value: counts.disaster, footer: "Disaster", color: "var(--card-disaster)" },
    { value: counts.high, footer: "High", color: "var(--card-high)" },
    { value: counts.average, footer: "Average", color: "var(--card-average)" },
    { value: counts.warning, footer: "Warning", color: "var(--card-warning)" },
    { value: counts.information, footer: "Information", color: "var(--card-info)" },
    { value: counts.not_classified, footer: "Not classified", color: "var(--card-grey)" },
  ];

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        marginTop: 20,
      }}
    >
      <Row gutter={[16, 16]} justify="center" wrap={false}>
        {metrics.map((metric, index) => (
          <Col key={index}>
            <MetricCard {...metric} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
