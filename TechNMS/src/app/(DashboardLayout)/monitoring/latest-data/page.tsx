"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import {
  Button,
  Form,
  Input,
  Select,
  Row,
  Col,
  message,
} from "antd";
import axios from "axios";
import type { FormProps } from "antd";
import LatestDataTable from "./aaj";
import branches from "../../availability/data/data";

type SizeType = Parameters<typeof Form>[0]["size"];

type HostGroup = {
  groupid: string;
  name: string;
};

export default function LatestDataPage() {
  const [componentSize, setComponentSize] =
    useState<SizeType | "default">("small");
  const [form] = Form.useForm();
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [hosts, setHosts] = useState<any[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [value, setValue] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : "";

  const axiosCfg = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user_token}`,
    },
  };

  const onFormLayoutChange: FormProps<any>["onValuesChange"] = ({
    size,
  }) => {
    setComponentSize(size);
  };

  // 🔹 STRICT MODE GUARD
  const hasFetchedGroups = useRef(false);

  // ===================== GET HOST GROUPS (ONCE) =====================

  const handleGetHostGroups = async () => {
    setLoadingGroups(true);

    const payload = {
      jsonrpc: "2.0",
      method: "hostgroup.get",
      params: {
        output: ["groupid", "name"],
      },
      id: 1,
    };

    try {
      const response = await axios.post(
        "/api/zabbix-proxy",
        payload,
        axiosCfg
      );

      const items = response?.data?.result ?? [];
      const normalized = Array.isArray(items)
        ? items.map((g: any) => ({
            groupid: String(g.groupid),
            name: g.name,
          }))
        : [];

      setHostGroups(normalized);
    } catch (err: any) {
      console.error("Hostgroup fetch error", err);
      setHostGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // ===================== GET HOSTS (ONLY WHEN GROUP SELECTED) =====================

  const handleGetHosts = async (groupIds: string[]) => {
    if (!groupIds?.length) {
      setHosts([]);
      return;
    }

    setLoadingHosts(true);

    const payload = {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "name"],
        groupids: groupIds,
      },
      id: 2,
    };

    try {
      const res = await axios.post(
        "/api/zabbix-proxy",
        payload,
        axiosCfg
      );
      setHosts(res?.data?.result ?? []);
    } catch (err: any) {
      console.error("Host fetch error", err);
      setHosts([]);
    } finally {
      setLoadingHosts(false);
    }
  };

  // ✅ CALL ONCE ON PAGE LOAD (STRICT MODE SAFE)
  useEffect(() => {
    if (hasFetchedGroups.current) return;
    hasFetchedGroups.current = true;
    handleGetHostGroups();
  }, []);

  // ✅ CALL ONLY WHEN HOST GROUPS CHANGE
  useEffect(() => {
    handleGetHosts(value);
  }, [value]);

  // ===================== FIND BRANCH (NEW) =====================
  const findBranch = (hostName: string | undefined) => {
    if (!hostName) return "-";
    const match =
      branches.find(
        (b: any) =>
          hostName.includes(b.code) ||
          hostName.toLowerCase() === b.name.toLowerCase()
      ) ?? null;
    return match ? match.name : "-";
  };

  // ===================== APPLY BUTTON (TABLE DATA) =====================

  const handleApply = async () => {
    setLoadingTable(true);

    const params: any = {
      output: [
        "itemid",
        "name",
        "lastvalue",
        "lastclock",
        "delta",
        "prevvalue",
        "type",
      ],
      selectHosts: ["hostid", "name"],
      selectTags: ["tag", "value"],
    };

    if (selectedHosts?.length) {
      params.hostids = selectedHosts;
    }

    const payload = {
      jsonrpc: "2.0",
      method: "item.get",
      params,
      id: 1,
    };

    try {
      const res = await axios.post(
        "/api/zabbix-proxy",
        payload,
        axiosCfg
      );

      const items = res?.data?.result ?? [];

      if (!Array.isArray(items) || items.length === 0) {
        message.info("No items returned for the current filter.");
      }

      const formatted = Array.isArray(items)
        ? items.map((item: any) => {
            const hostName =
              item.hosts?.[0]?.name ??
              item.hosts?.[0]?.hostid ??
              "Unknown";

            return {
              key: String(
                item.itemid ?? JSON.stringify(item)
              ),
              host: hostName,
              branch: findBranch(hostName), // ✅ NEW
              name: item.name ?? "",
              lastValue: item.lastvalue ?? "",
              lastCheck: item.lastclock
                ? new Date(
                    Number(item.lastclock) * 1000
                  ).toLocaleString()
                : "-",
              change: item.delta
                ? String(item.delta)
                : "-",
              tags: Array.isArray(item.tags)
                ? item.tags
                    .map(
                      (t: any) =>
                        `${t.tag}:${t.value}`
                    )
                    .join(", ")
                : "-",
              info: "-",
            };
          })
        : [];

      setTableData(formatted);
    } catch (err: any) {
      console.error("Table fetch failed", err);
      setTableData([]);
    } finally {
      setLoadingTable(false);
    }
  };

  const MAX_COUNT = 3;
  const suffix = (
    <span style={{ color: "#8c8c8c" }}>▾</span>
  );

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ size: "small" }}
        size="small"
        style={{
          background: "#ffffff",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #e6e6e6",
        }}
      >
        <Row gutter={[24, 16]}>
          <Col span={8}>
            <Form.Item label="Name">
              <Input
                placeholder="Enter name"
                size="middle"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Host groups">
              <Select
                mode="multiple"
                maxCount={MAX_COUNT}
                value={value}
                loading={loadingGroups}
                style={{ width: "100%" }}
                onChange={setValue}
                suffixIcon={suffix}
                placeholder="Please select"
                size="middle"
                options={hostGroups.map((g) => ({
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
                maxCount={MAX_COUNT}
                value={selectedHosts}
                loading={loadingHosts}
                style={{ width: "100%" }}
                onChange={setSelectedHosts}
                suffixIcon={suffix}
                placeholder="Please select"
                size="middle"
                options={hosts.map((h) => ({
                  value: h.hostid,
                  label: h.name,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <div
          style={{
            borderBottom: "1px solid #eee",
            margin: "20px 0",
          }}
        />

        <Row
          justify="center"
          gutter={16}
          style={{ marginTop: 10 }}
        >
          <Col>
            <Button size="middle">Save as</Button>
          </Col>

          <Col>
            <Button
              type="primary"
              size="middle"
              style={{
                padding: "0 28px",
                borderRadius: 6,
              }}
              onClick={handleApply}
            >
              Apply
            </Button>
          </Col>

          <Col>
            <Button size="middle">Reset</Button>
          </Col>
        </Row>
      </Form>

      <div style={{ marginTop: 24 }}>
        <Suspense fallback={<div>Loading....</div>}>
          <LatestDataTable
            data={tableData}
            loading={loadingTable}
          />
        </Suspense>
      </div>
    </div>
  );
}
