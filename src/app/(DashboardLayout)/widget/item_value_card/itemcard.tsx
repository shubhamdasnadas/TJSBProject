"use client";

import React from "react";
import { Card, Typography, Space } from "antd";
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";

const { Text, Title } = Typography;

interface ItemcardProps {
  hostName?: string;
  timestamp?: string;
  value?: number;
  unit?: string;
  label?: string;
  trend?: "up" | "down";
}

const Itemcard: React.FC<ItemcardProps> = ({
  hostName = "Host name",
  timestamp = new Date().toLocaleString(),
  value = 0,
  unit = "%",
  label = "Metric",
  trend = "up",
}) => {
  return (
    <Card
      bordered
      style={{
        width: 260,
        textAlign: "center",
      }}
    >
      <Space direction="vertical" size={6} style={{ width: "100%" }}>
        {/* Host name */}
        <Text type="secondary" style={{ fontSize: 13 }}>
          {hostName}
        </Text>

        {/* Timestamp */}
        <Text type="secondary" style={{ fontSize: 12 }}>
          {timestamp}
        </Text>

        {/* Value + Trend */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Title level={2} style={{ margin: 0 }}>
            {value.toFixed(2)} {unit}
          </Title>

          {trend === "up" ? (
            <ArrowUpOutlined style={{ color: "#52c41a", fontSize: 22 }} />
          ) : (
            <ArrowDownOutlined style={{ color: "#ff4d4f", fontSize: 22 }} />
          )}
        </div>

        {/* Label */}
        <Text style={{ fontSize: 14 }}>{label}</Text>
      </Space>
    </Card>
  );
};

export default Itemcard;
