"use client";

import { Card, Typography, Row, Col } from "antd";

const { Text, Title } = Typography;

/* -------------------- STYLES -------------------- */

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e5e5",
  borderRadius: 10,
  padding: 0,
  width: "263px",     // fixed width → ensures one row
  height: 150,
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const innerStyle: React.CSSProperties = {
  padding: "22px 26px",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const titleStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  color: "#333",
  
};

const valueStyle: React.CSSProperties = {
  textAlign: "center",
  fontWeight: 700,
  fontSize: "22px",
  marginTop: 40,
  
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "12px",
  color: "#777",
};

/* -------------------- CARD COMPONENT -------------------- */

const MetricCard = ({ title, value, footer }: { title: string; value: string; footer: string }) => {
  return (
    <Card style={cardStyle} styles={{ body: innerStyle }}>
      <Text style={titleStyle}>{title}</Text>

      <Title level={3} style={valueStyle}>{value}</Title>

      <Text style={footerStyle}>{footer}</Text>
    </Card>
  );
};

/* -------------------- MAIN COMPONENT -------------------- */

export default function DashboardSummary() {
  const metrics = [
    { title: "PCPL_FIREWALL: SNMP agent availability", value: "Available (1.00)", footer: "SNMP agent availability" },
    { title: "PCPL_FIREWALL: System uptime", value: "68 days, 02:15:52", footer: "System uptime" },
    { title: "PCPL_FIREWALL: Used memory", value: "2 GB", footer: "Used memory" },
    { title: "PCPL_FIREWALL: Available memory", value: "1.84 GB", footer: "Available memory" },
    { title: "PCPL_FIREWALL: Memory utilization", value: "48 %", footer: "Memory utilization" },
  ];

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 20 }}>
      
      {/* ⭐ ONE SINGLE ROW ALWAYS */}
      <Row gutter={[20, 20]} justify="center" wrap={false}>
        {metrics.map((metric, index) => (
          <Col key={index}>
            <MetricCard {...metric} />
          </Col>
        ))}
      </Row>

    </div>
  );
}
