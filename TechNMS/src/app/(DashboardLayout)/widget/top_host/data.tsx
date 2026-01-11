"use client";

import React, { useState, useEffect, useRef } from "react";
import { Form, Select, Button, Table, Card, Checkbox } from "antd";

import useZabbixData from "../three";
import ColumnModal, { ColumnConfig } from "./ColumnModal";
import axios from "axios";
import branches from "../../availability/data/data";

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

  const [showPreview, setShowPreview] = useState<boolean>(
    mode === "preview" ? true : false
  );

  /* ===================== INITIAL FETCH ===================== */

  useEffect(() => {
    if (mode !== "preview" || !showPreviewData || !topHostName?.length) return;

    const fetchDashboardData = async () => {
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

        setColumnsConfig(() => {
          const updated: ColumnConfig[] = [];

          apiResult.forEach((row: any) => {
            const resolvedHostName =
              row.hostname ||
              row.hosts?.[0]?.name ||
              hosts.find((h) => h.hostid === row.hostid)?.name ||
              row.hostid;

            updated.push({
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
            });
          });

          return updated;
        });
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      }
    };

    fetchDashboardData();
  }, [mode, showPreviewData, topHostName, user_token, hosts]);

  useEffect(() => {
    columnsRef.current = columnsConfig;
  }, [columnsConfig]);

  useEffect(() => {
    if (initialConfig?.columns) setColumnsConfig(initialConfig.columns);
  }, [initialConfig]);

  useEffect(() => {
    if (!onConfigChange) return;
    onConfigChange({ columns: columnsConfig });
  }, [columnsConfig, onConfigChange]);

  /* ===================== AUTO REFRESH ===================== */

  useEffect(() => {
    if (!showPreview) return;

    const interval = setInterval(async () => {
      const rows = columnsRef.current.filter((c) => c.itemName);
      if (!rows.length) return;

      const uniqueRequests: Array<{ name: string; groupids: any }> = [];

      rows.forEach((c) => {
        const sig = `${c.itemName}-${JSON.stringify(c.extraHostGroups)}`;
        if (
          !uniqueRequests.some(
            (r) => `${r.name}-${JSON.stringify(r.groupids)}` === sig
          )
        ) {
          uniqueRequests.push({
            name: c.itemName!,
            groupids: c.extraHostGroups,
          });
        }
      });

      try {
        const responses = await Promise.all(
          uniqueRequests.map((r) =>
            axios.post("/api/tjsb/get_item", {
              auth: user_token,
              name: r.name,
              groupids: r.groupids,
            })
          )
        );

        setColumnsConfig((prev) => {
          const updated = [...prev];
          responses.forEach((res) => {
            (res.data?.result ?? []).forEach((row: any) => {
              const target = updated.find(
                (r) => r.hostId === row.hostid && r.itemName === row.name
              );
              if (target) {
                (target as any).apiData = row;
              }
            });
          });
          return updated;
        });
      } catch (err) {
        console.warn("Preview refresh error:", err);
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [showPreview, user_token]);

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

  /* ===================== BUILD PREVIEW DATA ===================== */

  const hostsMap: Record<string, any> = {};

  columnsConfig.forEach((c) => {
    if (!(c as any).apiData) return;

    const api = (c as any).apiData;

    if (!hostsMap[c.hostName!]) {
      hostsMap[c.hostName!] = {
        key: c.hostName!,
        host: c.hostName!,
        branch: findBranch(c.hostName),
      };
    }

    // 🔹 Preserve raw value for host1
    // 🔹 Extend object for host2 CPU / Memory
    hostsMap[c.hostName!][c.name!] =
      c.name === "CPU utilization" || c.name === "Memory utilization"
        ? {
          value: api?.lastvalue ?? 0,
          statusColor: api?.statusColor,
        }
        : api?.lastvalue ?? 0;
  });

  let previewRows: any[] = Object.values(hostsMap);

  const uniqueColumns = columnsConfig.filter(
    (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i
  );

  /* ===================== HOST1 SORTING (UNCHANGED) ===================== */

  const COL_A = 'Interface ["GigabitEthernet0/0/0"]: Operational status';
  const COL_B = 'Interface ["GigabitEthernet0/0/1"]: Operational status';

  previewRows = [...previewRows].sort((a, b) => {
    const aA = Number(a[COL_A]) === 1 ? 1 : 0;
    const bA = Number(b[COL_A]) === 1 ? 1 : 0;
    if (aA !== bA) return bA - aA;

    const aB = Number(a[COL_B]) === 1 ? 1 : 0;
    const bB = Number(b[COL_B]) === 1 ? 1 : 0;
    if (aB !== bB) return bB - aB;

    for (let col of uniqueColumns) {
      const colName = col.name!;
      const aVal = Number(a[colName]) === 1 ? 1 : 0;
      const bVal = Number(b[colName]) === 1 ? 1 : 0;
      if (aVal !== bVal) return bVal - aVal;
    }

    return 0;
  });

  /* ===================== TABLE COLUMNS ===================== */

  const dynamicColumns = uniqueColumns.map((c) => ({
    title: c.name,
    dataIndex: c.name!,
    render: (cell: any) => {
      // 🔹 HOST2 CPU / MEMORY COLORING
      if (
        c.name === "CPU utilization" ||
        c.name === "Memory utilization"
      ) {
        if (!cell) return "-";

        const value = Number(cell.value);
        const color = cell.statusColor;

        const bg =
          color === "green"
            ? "#00b050"
            : color === "orange"
              ? "#ffa500"
              : color === "red"
                ? "#ff0000"
                : undefined;

        return (
          <span
            style={{
              display: "block",
              textAlign: "center",
              padding: "4px 0",
              background: bg,
              color: bg ? "#fff" : "#000",
              fontWeight: 600,
            }}
          >
            {value.toFixed(2)}%
          </span>
        );
      }

      // 🔹 HOST1 OPERATIONAL STATUS (UNCHANGED)
      const num = Number(cell);
      if (num === 0) {
        return (
          <span
            style={{
              display: "block",
              textAlign: "center",
              padding: "4px 0",
              background: "#00b050",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            up ({num.toFixed(2)})
          </span>
        );
      }

      if (num === 1) {
        return (
          <span
            style={{
              display: "block",
              textAlign: "center",
              padding: "4px 0",
              background: "#ff0000",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            down ({num.toFixed(2)})
          </span>
        );
      }

      return cell ?? "-";
    },
  }));

  /* ===================== UI ===================== */

  return (
    <>
      <Form layout="vertical">
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
