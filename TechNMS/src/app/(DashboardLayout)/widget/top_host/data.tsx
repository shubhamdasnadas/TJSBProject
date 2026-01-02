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
}

const TopHost: React.FC<TopHostProps> = ({
  mode = "widget",
  onConfigChange,
  initialConfig,
}) => {
  const { hostGroups, hosts, items, fetchZabbixData } = useZabbixData();

  const user_token = localStorage.getItem("zabbix_auth");

  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  const columnsRef = useRef<ColumnConfig[]>([]);
  const [editing, setEditing] = useState<ColumnConfig | null>(null);
  const [open, setOpen] = useState(false);

  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // ⭐ PREVIEW ALWAYS TRUE IN PREVIEW MODE
  const [showPreview, setShowPreview] = useState<boolean>(
    mode === "preview" ? true : false
  );

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

  /* ===================== SAVE COLUMN ===================== */

  const handleSaveColumn = async (c: ColumnConfig) => {
    let apiResult: any[] = [];

    const existing = columnsConfig.find((col) => col.id === c.id);

    if (existing && existing.apiData) {
      apiResult = [existing.apiData];
    } else {
      try {
        if (c.itemName) {
          const response = await axios.post("/api/tjsb/get_item", {
            auth: user_token,
            name: c.itemName,
            groupids: c.extraHostGroups,
          });

          apiResult = response.data?.result ?? [];
        }
      } catch (err) {
        console.error("API error:", err);
      }
    }

    setColumnsConfig((prev) => {
      let updated = [...prev];

      apiResult.forEach((row) => {
        const resolvedHostName =
          hosts.find((h) => h.hostid === row.hostid)?.name ?? c.hostName;

        const found = updated.find((r) => r.id === c.id);

        if (found) {
          Object.assign(found, {
            ...found,
            ...c,
            hostName: resolvedHostName,
            apiData: row || found.apiData,
          });
        } else {
          updated.push({
            ...c,
            id: makeId(),
            hostId: row.hostid,
            hostName: resolvedHostName,
            itemId: row.itemid,
            itemKey: row.key_,
            itemName: row.name,
            apiData: row,
          });
        }
      });

      return updated;
    });

    setEditing(null);
    setOpen(false);
  };

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
          let updated = [...prev];

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
    }, 10000);

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

    hostsMap[c.hostName!][c.name!] = api?.lastvalue ?? 0;
  });

  let previewRows: any[] = Object.values(hostsMap);

  const uniqueColumns = columnsConfig.filter(
    (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i
  );

  previewRows = [...previewRows].sort((a, b) => {
    for (let col of uniqueColumns) {
      const colName = col.name!;
      const aVal = Number(a[colName]) === 1 ? 1 : 0;
      const bVal = Number(b[colName]) === 1 ? 1 : 0;

      if (aVal !== bVal) return bVal - aVal;
    }

    return 0;
  });

  const dynamicColumns = uniqueColumns.map((c) => ({
    title: c.name,
    dataIndex: c.name!,
    render: (value: any) => {
      const num = Number(value);
      const label = `(${num.toFixed(2)})`;

      if (num === 0) {
        return (
          <span
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "4px 0",
              background: "#00b050",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            up {label}
          </span>
        );
      }

      if (num === 1) {
        return (
          <span
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "4px 0",
              background: "#ff0000",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            down {label}
          </span>
        );
      }

      return value ?? "-";
    },
  }));

  /* ===================== UI ===================== */

  return (
    <>
      <Form layout="vertical">
        {/* SHOW BUILDER CONTROLS ONLY IN WIDGET MODE */}
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

            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Add Column
            </Button>

            <Card title="Columns" style={{ marginTop: 20 }}>
              <Table
                size="small"
                rowKey="id"
                pagination={false}
                dataSource={uniqueColumns}
                columns={[
                  { title: "Name", dataIndex: "name" },
                  { title: "Data", dataIndex: "itemName" },
                  {
                    title: "Actions",
                    render: (_, r) => (
                      <>
                        <a
                          onClick={() => {
                            setEditing(r);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </a>{" "}
                        |{" "}
                        <a
                          onClick={() =>
                            setColumnsConfig((p) =>
                              p.filter((x) => x.id !== r.id)
                            )
                          }
                        >
                          Remove
                        </a>
                      </>
                    ),
                  },
                ]}
              />
            </Card>
          </>
        )}

        {/* ALWAYS SHOW PREVIEW IF TRUE */}
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
        onSubmit={handleSaveColumn}
        selectedHostGroups={selectedGroups}
      />
    </>
  );
};

export default TopHost;
