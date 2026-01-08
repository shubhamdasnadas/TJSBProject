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

interface TagFilter {
  id: number;
  key: string;
  operator: string;
  value: string;
}

const Services = () => {
  const [tags, setTags] = useState<TagFilter[]>([
    { id: 1, key: "", operator: "contains", value: "" },
  ]);

  const addTag = () => {
    setTags([
      ...tags,
      {
        id: Date.now(),
        key: "",
        operator: "contains",
        value: "",
      },
    ]);
  };

  const removeTag = (id: number) => {
    setTags(tags.filter((tag) => tag.id !== id));
  };

  const updateTag = (
    id: number,
    field: keyof TagFilter,
    value: string
  ) => {
    setTags(
      tags.map((tag) =>
        tag.id === id ? { ...tag, [field]: value } : tag
      )
    );
  };

  return (
    <Card
      style={{ width: "100%" }}
    >
      <Form layout="vertical">

        {/* ================= ROW 1 ================= */}
        <Row gutter={24} align="bottom">
          <Col span={8}>
            <Form.Item label="Name">
              <Input placeholder="Enter name" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Status">
              <Radio.Group defaultValue="any">
                <Radio.Button value="any">Any</Radio.Button>
                <Radio.Button value="ok">OK</Radio.Button>
                <Radio.Button value="problem">Problem</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        {/* ================= TAG FILTER ================= */}
        <Form.Item label="Tags" />

        {tags.map((tag) => (
          <Row
            gutter={16}
            align="middle"
            key={tag.id}
            style={{ marginBottom: 12 }}
          >
            <Col span={6}>
              <Select
                placeholder="tag"
                value={tag.key}
                onChange={(val) => updateTag(tag.id, "key", val)}
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
          style={{ paddingLeft: 0, marginBottom: 16 }}
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
  );
};

export default Services;
