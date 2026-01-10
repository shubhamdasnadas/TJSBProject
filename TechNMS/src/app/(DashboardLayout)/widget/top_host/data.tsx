"use client";

import React, { useState, useEffect, useRef } from "react";
import { Form, Select, Button, Table, Card, Checkbox } from "antd";

import useZabbixData from "../three";
import ColumnModal, { ColumnConfig } from "./ColumnModal";
import axios from "axios";
import branches from "../../availability/data/data";

/* ===================== CACHE KEYS ===================== */
const CACHE_KEY = "top_host_cache";

/* ===================== UTILS ===================== */
const makeId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

interface TopHostProps {
  mode?: "preview" | "widget";
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
  topHostName?: ("host1" | "host2")[];
  showPreviewData?: boolean;
}

const HOST_ITEM_MAP: Record<"host1" | "host2", string[]> = {
  host1: [
    'Interface ["GigabitEthernet0/0/0"]: Operational status',
    'Interface ["GigabitEthernet0/0/1"]: Operational status',
  ],
  host2: [
    'Interface ["GigabitEthernet0/0/0"]: Bits sent',
    'Interface ["GigabitEthernet0/0/0"]: Bits received',
    'Interface ["GigabitEthernet0/0/0"]: Speed',
    "Memory utilization",
    "CPU utilization",
    "Certificate validity",
  ],
};

const TopHost: React.FC<TopHostProps> = ({
  mode = "widget",
  onConfigChange,
  initialConfig,
  topHostName,
  showPreviewData,
}) => {
  const { hostGroups, hosts, items, fetchZabbixData } = useZabbixData();
  const user_token = localStorage.getItem("zabbix_auth");

  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  const columnsRef = useRef<ColumnConfig[]>([]);
  const [editing, setEditing] = useState<ColumnConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchingRef = useRef(false);
  const firstLoadRef = useRef(true);

  const [showPreview, setShowPreview] = useState(
    mode === "preview" ? true : false
  );

  /* ===================== LOAD CACHE ===================== */
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setColumnsConfig(JSON.parse(cached));
        firstLoadRef.current = false;
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  /* ===================== CACHE + CONFIG SYNC ===================== */
  useEffect(() => {
    columnsRef.current = columnsConfig;
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(columnsConfig));
    onConfigChange?.({ columns: columnsConfig });
  }, [columnsConfig, onConfigChange]);

  /* ===================== MAIN FETCH ===================== */
  const fetchDashboardData = async () => {
    if (
      fetchingRef.current ||
      mode !== "preview" ||
      !showPreviewData ||
      !topHostName?.length
    )
      return;

    fetchingRef.current = true;
    if (firstLoadRef.current) setLoading(true);

    try {
      const responses = await Promise.all(
        topHostName.map((hostKey) =>
          axios.post("/api/tjsb/get_item", {
            auth: user_token,
            name: HOST_ITEM_MAP[hostKey],
            groupids: ["210"],
          })
        )
      );

      const apiResult = responses.flatMap(
        (res) => res.data?.result ?? []
      );

      const updated: ColumnConfig[] = apiResult.map((row: any) => {
        const resolvedHostName =
          row.hostname ||
          row.hosts?.[0]?.name ||
          hosts.find((h) => h.hostid === row.hostid)?.name ||
          row.hostid;

        return {
          id: makeId(),
          name: row.name,
          data: "Item value",
          display: "as_is",
          extraHostGroups: ["210"],
          hostId: row.hostid,
          hostName: resolvedHostName,
          itemId: row.itemid,
          itemKey: row.key_,
          itemName: row.name,
          apiData: {
            ...row,
            hostname: resolvedHostName,
          },
        };
      });

      if (updated.length) {
        setColumnsConfig(updated);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(updated));
      }

      firstLoadRef.current = false;
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!showPreview) return;
    const interval = setInterval(fetchDashboardData, 120000);
    return () => clearInterval(interval);
  }, [showPreview]);

  useEffect(() => {
    if (initialConfig?.columns) setColumnsConfig(initialConfig.columns);
  }, [initialConfig]);

  /* ===================== BUILD PREVIEW (ORDER SAFE) ===================== */

  const findBranch = (hostName?: string) => {
    if (!hostName) return "-";
    const match =
      branches.find(
        (b: any) =>
          hostName.includes(b.code) ||
          hostName.toLowerCase() === b.name.toLowerCase()
      ) ?? null;
    return match ? match.name : "-";
  };

  const hostsMap: Record<string, any> = {};
  const orderedHosts: string[] = [];

  columnsConfig.forEach((c) => {
    if (!c.apiData) return;

    if (!hostsMap[c.hostName!]) {
      hostsMap[c.hostName!] = {
        key: c.hostName!,
        host: c.hostName!,
        branch: findBranch(c.hostName),
      };
      orderedHosts.push(c.hostName!); // ✅ preserve backend order
    }

    hostsMap[c.hostName!][c.name!] = c.apiData;
  });

  const previewRows = orderedHosts.map((h) => hostsMap[h]);

  const uniqueColumns = columnsConfig.filter(
    (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i
  );

  const dynamicColumns = uniqueColumns.map((c) => ({
    title: c.name,
    dataIndex: c.name!,
    render: (api: any) => {
      if (!api) return "-";

      const value = Number(api.lastvalue);
      const unit = api.units ? ` ${api.units}` : "";
      const color = api.statusColor;

      if (color) {
        return (
          <span
            style={{
              display: "block",
              textAlign: "center",
              padding: "4px 0",
              fontWeight: 600,
              background:
                color === "green"
                  ? "#00b050"
                  : color === "orange"
                    ? "#fa8c16"
                    : "#ff0000",
              color: "#fff",
            }}
          >
            {value.toFixed(2)}
            {unit}
          </span>
        );
      }

      if (value === 0)
        return (
          <span style={{ background: "#00b050", color: "#fff", display: "block", textAlign: "center" }}>
            up
          </span>
        );

      if (value === 1)
        return (
          <span style={{ background: "#ff0000", color: "#fff", display: "block", textAlign: "center" }}>
            down
          </span>
        );

      return `${value}${unit}`;
    },
  }));

  /* ===================== UI ===================== */

  return (
    <>
      <Form layout="vertical">
        {mode === "widget" && (
          <>
            <Form.Item label="Host Groups">
              <Select
                mode="multiple"
                onChange={(g) => {
                  setSelectedGroups(g);
                  fetchZabbixData("host", g);
                }}
                options={hostGroups.map((g) => ({
                  label: g.name,
                  value: g.groupid,
                }))}
              />
            </Form.Item>

            <Form.Item>
              <Checkbox
                checked={showPreview}
                onChange={(e) => setShowPreview(e.target.checked)}
              >
                Show preview
              </Checkbox>
            </Form.Item>

            <Button type="primary" onClick={() => setOpen(true)}>
              Add Column
            </Button>
          </>
        )}

        {showPreview && (
          <Card title="Preview Data" style={{ marginTop: 16 }}>
            <Table
              size="small"
              rowKey="key"
              pagination={false}
              scroll={{ y: 400 }}
              dataSource={previewRows}
              columns={[
                { title: "Host", dataIndex: "host" },
                { title: "Branch", dataIndex: "branch" },
                ...dynamicColumns,
              ]}
            />
          </Card>
        )}
      </Form>

      <ColumnModal
        open={open}
        hosts={hosts}
        items={items}
        initialData={editing}
        existingColumns={columnsConfig}
        onHostChange={(h) => fetchZabbixData("item", [h])}
        onCancel={() => setOpen(false)}
        onSubmit={() => { }}
        selectedHostGroups={selectedGroups}
      />
    </>
  );
};

export default TopHost;
