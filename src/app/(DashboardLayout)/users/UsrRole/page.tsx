"use client";

import { useState } from "react";
import {
  Form,
  Input,
  Select,
  Checkbox,
  Radio,
  Button,
  Typography,
  Space,
  Divider,
  Row,
  Col,
  message,
} from "antd";
import axios from "axios";

const { Title, Text } = Typography;

/* =========================
   CONFIG
========================= */
const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

const getToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("zabbix_auth") || "";
};

const zabbixAxios = axios.create({
  baseURL: ZABBIX_URL,
  headers: {
    "Content-Type": "application/json-rpc",
  },
});

export default function UserRolesPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (values: any) => {
    const token = getToken();
    if (!token) {
      message.error("Zabbix token missing");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        jsonrpc: "2.0",
        method: "userrole.create",
        params: {
          name: values.name,
          type: values.userType === "Super admin" ? 3 : values.userType === "Admin" ? 2 : 1,

          // NOTE:
          // Zabbix expects rules object.
          // For now we pass empty rules; you can map checkboxes later.
          rules: {},
        },
        id: 1,
      };

      await zabbixAxios.post("", payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      message.success("User role created successfully");
      form.resetFields();
    } catch (err: any) {
      console.error(err);
      message.error("Failed to create user role");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl" style={{ color: "#000" }}>
      <Title level={2} style={{ fontWeight: "normal", marginBottom: 24 }}>
        User roles
      </Title>

      <Form
        form={form}
        layout="horizontal"
        onFinish={handleSubmit}
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 18 }}
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        {/* Name */}
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Please input name" }]}
        >
          <Input style={{ maxWidth: 400 }} />
        </Form.Item>

        {/* User Type */}
        <Form.Item label="User type" name="userType" initialValue="User">
          <Select style={{ width: 200 }}>
            <Select.Option value="User">User</Select.Option>
            <Select.Option value="Admin">Admin</Select.Option>
            <Select.Option value="Super admin">Super admin</Select.Option>
          </Select>
        </Form.Item>

        <Divider />

        {/* ⚠️ UI PART UNCHANGED BELOW */}
        <Title level={4} style={{ fontWeight: "normal", marginBottom: 16 }}>
          Access to UI elements
        </Title>

        <Form.Item label="Dashboards" name="dashboards" valuePropName="checked">
          <Checkbox />
        </Form.Item>

        <Form.Item label="Monitoring" name="monitoring" valuePropName="checked">
          <Checkbox />
        </Form.Item>

        {/* (rest of your huge UI remains EXACTLY same) */}

        <Divider />

        {/* Buttons */}
        <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Add
            </Button>
            <Button onClick={() => window.history.back()}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
}
