"use client";

import { useEffect, useState } from "react";
import { Card, Select, Button, Table, message } from "antd";
import axios from "axios";

import branches from "../data/data";

const { Option } = Select;

/* ========= TYPES ========= */

interface Branch {
  name: string;
  code: string;
  ip?: string;
}

interface Host {
  hostid: string;
  host: string;
  name: string;
  description?: string;
  inventory?: Record<string, any>;
  hostgroup?: string;
}

interface Item {
  itemid: string;
  name: string;
}

/* ========= SMART CODE MATCHING ========= */

/**
 * Extracts something like:
 *   BR-C002-MAIN
 *   BR-C058-KLYNR
 * from ANY host fields.
 */
function extractCodeFromAny(h: any): string | null {
  const textPool: string[] = [];

  if (h.name) textPool.push(h.name);
  if (h.host) textPool.push(h.host);
  if (h.description) textPool.push(h.description);

  // inventory (Zabbix stores rich metadata here)
  if (h.inventory) {
    Object.values(h.inventory).forEach((v: any) => {
      if (typeof v === "string") textPool.push(v);
    });
  }

  for (const text of textPool) {
    const match = text.match(/BR-[A-Z0-9-]+/i);
    if (match) return match[0].toUpperCase();
  }

  return null;
}

function findBranchForHostObject(h: Host): Branch | undefined {
  const code = extractCodeFromAny(h);
  if (!code) return undefined;

  return (branches as Branch[]).find(
    (b) => b.code.toUpperCase() === code
  );
}

/* ========= COMPONENT ========= */

export default function ZabbixSelector() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [pivotData, setPivotData] = useState<any[]>([]);
  const [pivotCols, setPivotCols] = useState<any[]>([]);

  const auth =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  /* ===== LOAD HOSTS ===== */

  useEffect(() => {
    if (!auth) return;

    axios
      .post("/api/tjsb/get_host", { auth })
      .then((res) => {
        const apiHosts: Host[] = res.data?.result ?? [];

        const enriched = apiHosts.map((h) => {
          const matched = findBranchForHostObject(h);

          return {
            ...h,
            hostgroup: matched?.name ?? "Unknown",
          };
        });

        setHosts(enriched);
      })
      .catch(() => message.error("Failed to load hosts"));
  }, [auth]);

  /* ===== LOAD ITEMS ===== */

  const loadItems = async (hostids: string[]) => {
    const res = await axios.post("/api/tjsb/get_item", {
      hostids,
      auth,
    });

    setItems(res.data?.result ?? []);
    setSelectedItems([]);
    setPivotData([]);
  };

  /* ===== BUILD TABLE ===== */

  const buildMatrix = async () => {
    if (!selectedItems.length) {
      message.error("Select item(s)");
      return;
    }

    const res = await axios.post("/api/tjsb/get_item_matrix", {
      hostids: selectedHosts,
      itemids: selectedItems,
      auth,
    });

    const data = res.data?.result ?? [];

    const rows = hosts
      .filter((h) => selectedHosts.includes(h.hostid))
      .map((h) => ({
        key: h.hostid,
        host: h.name,
        hostgroup: h.hostgroup,
      }));

    data.forEach((i: any) => {
      const row = rows.find((r: any) => r.key === i.hostid);
      if (row) (row as any)[i.itemid] = i.lastvalue;
    });

    const dynamicCols = selectedItems.map((id) => {
      const it = items.find((x: any) => x.itemid === id);
      return { title: it?.name || id, dataIndex: id };
    });

    setPivotData(rows);

    setPivotCols([
      { title: "Host", dataIndex: "host" },
      { title: "Host Group", dataIndex: "hostgroup" },
      ...dynamicCols,
    ]);

    message.success("Loaded");
  };

  return (
    <Card title="Zabbix Selector">
      {/* HOST TABLE */}
      {hosts.length > 0 && (
        <Card title="Hosts" style={{ marginBottom: 16 }}>
          <Table
            pagination={false}
            rowKey="hostid"
            dataSource={hosts}
            columns={[
              { title: "Host", dataIndex: "name" },
              { title: "Host Code (Zabbix)", dataIndex: "host" },
              { title: "Host Group", dataIndex: "hostgroup" },
            ]}
          />
        </Card>
      )}

      {/* HOST SELECT */}
      <label>Hosts</label>
      <Select
        mode="multiple"
        value={selectedHosts}
        onChange={(v) => {
          setSelectedHosts(v);
          loadItems(v);
        }}
        style={{ width: "100%", marginBottom: 16 }}
      >
        {hosts.map((h) => (
          <Option key={h.hostid} value={h.hostid}>
            {h.name}
          </Option>
        ))}
      </Select>

      {/* ITEMS */}
      <label>Items</label>
      <Select
        mode="multiple"
        disabled={!selectedHosts.length}
        value={selectedItems}
        onChange={setSelectedItems}
        style={{ width: "100%", marginBottom: 16 }}
      >
        {items.map((i) => (
          <Option key={i.itemid} value={i.itemid}>
            {i.name}
          </Option>
        ))}
      </Select>

      <Button type="primary" onClick={buildMatrix}>
        Build table
      </Button>

      {pivotData.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <Table columns={pivotCols} dataSource={pivotData} />
        </Card>
      )}
    </Card>
  );
}
