"use client";

import React from "react";
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  DatePicker,
  Space,
  Typography,
  Form,
} from "antd";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const Slareport = () => {
  return (
    <div style={{ padding: 16 }}>
      <Card>
        <Form layout="vertical">
          {/* ================= FILTER ROW ================= */}
          <Row gutter={24} align="bottom">
            {/* SLA */}
            <Col span={6}>
              <Form.Item label="SLA">
                <Select
                  showSearch
                  placeholder="Type here to search"
                  options={[
                    { value: "sla1", label: "SLA 1" },
                    { value: "sla2", label: "SLA 2" },
                  ]}
                />
              </Form.Item>
            </Col>

            {/* Service */}
            <Col span={6}>
              <Form.Item label="Service">
                <Select
                  showSearch
                  placeholder="Type here to search"
                  options={[
                    { value: "service1", label: "Service 1" },
                    { value: "service2", label: "Service 2" },
                  ]}
                />
              </Form.Item>
            </Col>

            {/* Date Range */}
            <Col span={8}>
              <Form.Item label="From / To">
                <RangePicker
                  style={{ width: "100%" }}
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* ================= ACTION BUTTONS ================= */}
          <Row justify="center">
            <Space>
              <Button type="primary">Apply</Button>
              <Button>Reset</Button>
            </Space>
          </Row>
        </Form>
      </Card>

      {/* ================= EMPTY STATE ================= */}
      <Card style={{ marginTop: 16, textAlign: "center" }}>
        <Text type="secondary">
          Select SLA to display SLA report.
        </Text>
      </Card>
    </div>
  );
};

export default Slareport;
