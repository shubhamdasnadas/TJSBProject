"use client";

import { Card, Typography, Row, Col } from "antd";

const { Text, Title } = Typography;

/* -------------------- STYLES -------------------- */

const cardStyle: React.CSSProperties = {
  marginTop: 10,
  borderRadius: 10,
  padding: 0,
  width: 220,
  height: 150,
  border: "none"
};

const innerStyle: React.CSSProperties = {
  padding: "16px 20px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const titleStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#333",
};

const valueStyle: React.CSSProperties = {
  textAlign: "center",
  fontWeight: 700,
  fontSize: "16px",
  marginTop: 20,
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "12px",
  color: "#777",
};

/* -------------------- CARD COMPONENT -------------------- */

const MetricCard = ({
  title,
  value,
  footer,
}: {
  title: string;
  value: string;
  footer: string;
}) => (
  <Card style={cardStyle} styles={{ body: innerStyle }}>
    <Text style={titleStyle}>{title}</Text>
    <Title level={4} style={valueStyle}>
      {value}
    </Title>
    <Text style={footerStyle}>{footer}</Text>
  </Card>
);

/* -------------------- MAIN COMPONENT -------------------- */

export default function DashboardSummary() {
  const metrics = [
    {
      title: "PCPL_FIREWALL: SNMP agent availability",
      value: "Available (1.00)",
      footer: "SNMP agent availability",
    },
    {
      title: "PCPL_FIREWALL: System uptime",
      value: "68 days, 02:15:52",
      footer: "System uptime",
    },
    {
      title: "PCPL_FIREWALL: Used memory",
      value: "2 GB",
      footer: "Used memory",
    },
    {
      title: "PCPL_FIREWALL: Available memory",
      value: "1.84 GB",
      footer: "Available memory",
    },
    {
      title: "PCPL_FIREWALL: Memory utilization",
      value: "48 %",
      footer: "Memory utilization",
    },
  ];

  return (
    <div style={{ width: "100%", padding: "10px 0" }}>
      <Row
        wrap={false}
        gutter={[8, 0]}
        justify="center"
        style={{ width: "100%" }}
      >
        {metrics.map((metric, index) => (
          <Col key={index} flex="0 0 auto">
            <MetricCard {...metric} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
