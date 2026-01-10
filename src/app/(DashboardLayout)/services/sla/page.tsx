"use client";

import React, { useState } from "react";
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Select,
  Space,
  Divider,
  Radio,
  Form,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  FilterOutlined,
} from "@ant-design/icons";

const { Option } = Select;

interface ServiceTag {
  id: number;
  tag: string;
  operator: string;
  value: string;
}

const SLA = () => {
  const [serviceTags, setServiceTags] = useState<ServiceTag[]>([
    { id: 1, tag: "", operator: "contains", value: "" },
  ]);

  const addTag = () => {
    setServiceTags([
      ...serviceTags,
      {
        id: Date.now(),
        tag: "",
        operator: "contains",
        value: "",
      },
    ]);
  };

  const removeTag = (id: number) => {
    setServiceTags(serviceTags.filter((t) => t.id !== id));
  };

  const updateTag = (
    id: number,
    field: keyof ServiceTag,
    value: string
  ) => {
    setServiceTags(
      serviceTags.map((t) =>
        t.id === id ? { ...t, [field]: value } : t
      )
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <Card
        title={
          <Space>
            <FilterOutlined />
            SLA
          </Space>
        }
      >
        <Form layout="vertical">

          {/* ================= ROW 1 ================= */}
          <Row gutter={24} align="bottom">
            <Col span={8}>
              <Form.Item label="Name">
                <Input placeholder="Enter SLA name" />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="Status">
                <Radio.Group defaultValue="any">
                  <Radio.Button value="any">Any</Radio.Button>
                  <Radio.Button value="enabled">Enabled</Radio.Button>
                  <Radio.Button value="disabled">Disabled</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* ================= ROW 2 ================= */}
          <Form.Item label="Service tags" style={{ marginBottom: 8 }} />

          {/* AND / OR toggle */}
          <Row gutter={16} style={{ marginBottom: 12 }}>
            <Col>
              <Radio.Group defaultValue="and">
                <Radio.Button value="and">And</Radio.Button>
                <Radio.Button value="or">Or</Radio.Button>
              </Radio.Group>
            </Col>
          </Row>

          {serviceTags.map((tag) => (
            <Row
              gutter={16}
              align="middle"
              key={tag.id}
              style={{ marginBottom: 12 }}
            >
              <Col span={6}>
                <Select
                  placeholder="tag"
                  value={tag.tag}
                  onChange={(val) =>
                    updateTag(tag.id, "tag", val)
                  }
                  style={{ width: "100%" }}
                >
                  <Option value="service">service</Option>
                  <Option value="env">env</Option>
                  <Option value="type">type</Option>
                </Select>
              </Col>

              <Col span={5}>
                <Select
                  value={tag.operator}
                  onChange={(val) =>
                    updateTag(tag.id, "operator", val)
                  }
                  style={{ width: "100%" }}
                >
                  <Option value="contains">Contains</Option>
                  <Option value="equals">Equals</Option>
                </Select>
              </Col>

              <Col span={7}>
                <Input
                  placeholder="value"
                  value={tag.value}
                  onChange={(e) =>
                    updateTag(tag.id, "value", e.target.value)
                  }
                />
              </Col>

              <Col span={4}>
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => removeTag(tag.id)}
                >
                  Remove
                </Button>
              </Col>
            </Row>
          ))}

          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={addTag}
            style={{ paddingLeft: 0 }}
          >
            Add
          </Button>

          <Divider />

          {/* ================= ACTION BUTTONS ================= */}
          <Space>
            <Button type="primary">Apply</Button>
            <Button>Reset</Button>
          </Space>

        </Form>
      </Card>

      {/* ================= EMPTY TABLE STATE ================= */}
      <Card
        style={{ marginTop: 16, textAlign: "center" }}
      >
        <span style={{ color: "#999" }}>
          No data found
        </span>
      </Card>
    </div>
  );
};

export default SLA;
