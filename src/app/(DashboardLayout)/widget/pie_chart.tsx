"use client";

import React, { useEffect, useState } from "react";
import { Card, Form, Select, Row, Col } from "antd";
import { Pie } from "@ant-design/plots";
import axios from "axios";

/* ================= TYPES ================= */

interface HostGroup {
  groupid: string;
  name: string;
}

interface Host {
  hostid: string;
  name: string;
}

interface Item {
  itemid: string;
  name: string;
  key_: string;
}

interface PieData {
  type: string;
  value: number;
  gb: number;
}

interface PieChartProps {
  initialConfig?: {
    selectedGroups?: string[];
    selectedHosts?: string[];
    selectedItems?: string[];
  };
  onConfigChange?: (config: any) => void;
}

/* ================= COMPONENT ================= */

const PieChart: React.FC<PieChartProps> = ({
  initialConfig,
  onConfigChange,
}) => {
  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  /* 🔑 MODE DETECTION */
  const isViewOnly = !!initialConfig && !onConfigChange;

  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [pieData, setPieData] = useState<PieData[]>([]);

  /* ================= HELPERS ================= */

  const bytesToGB = (bytes: number) =>
    bytes / (1024 * 1024 * 1024);

  const COLORS = [
    "#ff4d4f",
    "#faad14",
    "#52c41a",
    "#1890ff",
    "#722ed1",
    "#13c2c2",
  ];

  /* ================= API ================= */

  const getHostGroups = async () => {
    if (!user_token) return;
    const res = await axios.post("/api/api_host/api_host_group", {
      auth: user_token,
    });
    setHostGroups(res.data?.result ?? []);
  };

  const getHosts = async (groupids: string[]) => {
    if (!user_token || !groupids.length) return;

    const res = await axios.post("/api/api_host/api_get_host", {
      auth: user_token,
      groupids,
    });

    setHosts(res.data?.result ?? []);
  };

  const getItems = async (hostids: string[]) => {
    if (!user_token || !hostids.length) return;

    const res = await axios.post("/api/dashboard_action_log/get_item", {
      auth: user_token,
      hostids,
    });

    setItems(res.data?.result ?? []);
  };

  const loadPieData = async (
    groups: string[],
    hostsIds: string[],
    itemIds: string[]
  ) => {
    if (!user_token || !hostsIds.length || !itemIds.length) return;

    const selectedItemObjects = items.filter((i) =>
      itemIds.includes(i.itemid)
    );

    if (!selectedItemObjects.length) return;

    const keys = selectedItemObjects.map((i) => i.key_);

    const res = await axios.post(
      "/api/dashboard_action_log/get_item_pie_chart",
      {
        auth: user_token,
        hostids: hostsIds,
        key_: keys,
      }
    );

    const result = res.data?.result ?? {};
    const hostName =
      hosts.find((h) => h.hostid === hostsIds[0])?.name ?? "Host";

    const slices: { label: string; gb: number }[] = [];

    keys.forEach((key) => {
      const raw = Number(result[key]?.[0]?.lastvalue ?? 0);
      if (!raw) return;

      const gb = bytesToGB(raw);

      let metric = "Value";
      if (key.toLowerCase().includes("used")) metric = "Used";
      else if (key.toLowerCase().includes("free")) metric = "Free";
      else if (key.toLowerCase().includes("total")) metric = "Total";

      slices.push({
        label: `${hostName}: ${metric}`,
        gb,
      });
    });

    const totalGB = slices.reduce((s, i) => s + i.gb, 0);

    setPieData(
      slices.map((s) => ({
        type: s.label,
        gb: s.gb,
        value: Number(((s.gb / totalGB) * 100).toFixed(2)),
      }))
    );
  };

  /* ================= INIT ================= */

  useEffect(() => {
    getHostGroups();
  }, []);

  /* 🔥 RESTORE CONFIG */
  useEffect(() => {
    if (!initialConfig) return;

    setSelectedGroups(initialConfig.selectedGroups ?? []);
    setSelectedHosts(initialConfig.selectedHosts ?? []);
    setSelectedItems(initialConfig.selectedItems ?? []);
  }, [initialConfig]);

  /* 🔥 RESTORE HOSTS */
  useEffect(() => {
    if (!isViewOnly || !selectedGroups.length) return;
    getHosts(selectedGroups);
  }, [isViewOnly, selectedGroups]);

  /* 🔥 RESTORE ITEMS */
  useEffect(() => {
    if (!isViewOnly || !selectedHosts.length) return;
    getItems(selectedHosts);
  }, [isViewOnly, selectedHosts]);

  /* 🔥 RESTORE PIE DATA */
  useEffect(() => {
    if (!isViewOnly) return;

    loadPieData(
      selectedGroups,
      selectedHosts,
      selectedItems
    );
  }, [isViewOnly, items]);

  /* 🔁 CONFIG SYNC */
  useEffect(() => {
    if (!onConfigChange) return;

    onConfigChange({
      selectedGroups,
      selectedHosts,
      selectedItems,
    });
  }, [selectedGroups, selectedHosts, selectedItems]);

  /* ================= PIE CONFIG ================= */

  const pieConfig = {
    data: pieData,
    angleField: "value",
    colorField: "type",
    radius: 0.75,
    color: (_: string, __: any, idx: number) =>
      COLORS[idx % COLORS.length],
    legend: { position: "left", flipPage: true },
    tooltip: {
      customContent: (_: string, items: any[]) => {
        if (!items?.length) return "";
        const d = items[0].datum as PieData;
        return `
          <div style="padding:8px">
            <b>${d.type}</b><br/>
            ${d.gb.toFixed(2)} GB<br/>
            ${d.value}%
          </div>
        `;
      },
    },
    interactions: [{ type: "element-active" }],
  };

  /* ================= VIEW ONLY ================= */

  if (isViewOnly) {
    return (
      <div style={{ width: "100%", height: "100%", minHeight: 260 }}>
        <Pie {...pieConfig} />
      </div>
    );
  }

  /* ================= CONFIG MODE ================= */

  return (
    <Form layout="vertical">
      <Row gutter={24}>
        <Col span={16}>
          <Card title="Pie chart">
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="Host group">
                  <Select
                    mode="multiple"
                    value={selectedGroups}
                    onChange={(ids) => {
                      setSelectedGroups(ids);
                      getHosts(ids);
                    }}
                    options={hostGroups.map((g) => ({
                      label: g.name,
                      value: g.groupid,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item label="Host">
                  <Select
                    mode="multiple"
                    value={selectedHosts}
                    onChange={(ids) => {
                      setSelectedHosts(ids);
                      getItems(ids);
                    }}
                    options={hosts.map((h) => ({
                      label: h.name,
                      value: h.hostid,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col span={8}>
                <Form.Item label="Item">
                  <Select
                    mode="multiple"
                    value={selectedItems}
                    onChange={(ids) => {
                      setSelectedItems(ids);
                      loadPieData(selectedGroups, selectedHosts, ids);
                    }}
                    options={items.map((i) => ({
                      label: i.name,
                      value: i.itemid,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={8}>
          <Card>
            <div style={{ width: "100%", height: 300 }}>
              <Pie {...pieConfig} />
            </div>
          </Card>
        </Col>
      </Row>
    </Form>
  );
};

export default PieChart;
