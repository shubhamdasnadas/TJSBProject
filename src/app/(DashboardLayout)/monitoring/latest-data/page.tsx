"use client";

import React, { useState, useEffect } from "react";
import {
  Button,
  Form,
  Input,
  Radio,
  Select,
  Row,
  Col,
  Space,
  Checkbox,
  message,
} from "antd";
import axios from "axios";
import LatestDataTable from "./table";

type HostGroup = {
  groupid: string;
  name: string;
};

export default function LatestDataPage() {
  const [form] = Form.useForm();
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  const axiosCfg = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  /* =========================
     HOST GROUPS
  ========================= */
  const handleGetHostGroups = async () => {
    const payload = {
      jsonrpc: "2.0",
      method: "hostgroup.get",
      params: { output: ["groupid", "name"] },
      id: 1,
    };

    const res = await axios.post("/api/zabbix-proxy", payload, axiosCfg);
    setHostGroups(res.data.result ?? []);
  };

  /* =========================
     HOSTS
  ========================= */
  const handleGetHosts = async (groups: string[]) => {
    if (!groups.length) return setHosts([]);

    const payload = {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "name"],
        groupids: groups,
      },
      id: 2,
    };

    const res = await axios.post("/api/zabbix-proxy", payload, axiosCfg);
    setHosts(res.data.result ?? []);
  };

  /* =========================
     APPLY
  ========================= */
  const handleApply = async () => {
    setLoadingTable(true);

    const payload = {
      jsonrpc: "2.0",
      method: "item.get",
      params: {
        output: ["itemid", "name", "lastvalue", "lastclock", "delta"],
        selectHosts: ["name"],
        ...(selectedHosts.length && { hostids: selectedHosts }),
      },
      id: 3,
    };

    try {
      const res = await axios.post("/api/zabbix-proxy", payload, axiosCfg);

      const formatted =
        res.data.result?.map((i: any) => ({
          key: i.itemid,
          itemid: i.itemid,
          host: i.hosts?.[0]?.name,
          name: i.name,
          lastValue: i.lastvalue,
          lastCheck: new Date(i.lastclock * 1000).toLocaleString(),
          change: i.delta ?? "-",
        })) ?? [];

      setTableData(formatted);
    } catch {
      message.error("item.get failed");
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    handleGetHostGroups();
    handleApply();
  }, []);

  useEffect(() => {
    handleGetHosts(groupIds);
  }, [groupIds]);

  return (
    <div>
      {/* 🔴 UI / ANT DESIGN — UNCHANGED */}
      <Form
        form={form}
        layout="vertical"
        style={{
          background: "#fff",
          padding: 20,
          borderRadius: 12,
          border: "1px solid #e6e6e6",
        }}
      >
        <Row gutter={[24, 16]}>
          <Col span={8}>
            <Form.Item label="Name">
              <Input placeholder="Enter name" />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Host groups">
              <Select
                mode="multiple"
                value={groupIds}
                onChange={setGroupIds}
                options={hostGroups.map(g => ({
                  value: g.groupid,
                  label: g.name,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Hosts">
              <Select
                mode="multiple"
                value={selectedHosts}
                onChange={setSelectedHosts}
                options={hosts.map(h => ({
                  value: h.hostid,
                  label: h.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Show tags">
              <Radio.Group defaultValue="3">
                <Radio.Button value="none">None</Radio.Button>
                <Radio.Button value="1">1</Radio.Button>
                <Radio.Button value="2">2</Radio.Button>
                <Radio.Button value="3">3</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item label="State">
              <Radio.Group defaultValue="all">
                <Radio.Button value="all">All</Radio.Button>
                <Radio.Button value="normal">Normal</Radio.Button>
                <Radio.Button value="not_supported">
                  Not supported
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            <Checkbox>Show details</Checkbox>
          </Col>
        </Row>

        <Row justify="center" gutter={16} style={{ marginTop: 16 }}>
          <Col>
            <Button>Save as</Button>
          </Col>
          <Col>
            <Button type="primary" onClick={handleApply}>
              Apply
            </Button>
          </Col>
          <Col>
            <Button>Reset</Button>
          </Col>
        </Row>
      </Form>

      <div style={{ marginTop: 24 }}>
        <LatestDataTable data={tableData} loading={loadingTable} />
      </div>
    </div>
  );
}
