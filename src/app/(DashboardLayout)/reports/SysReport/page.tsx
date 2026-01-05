"use client";

import { useEffect, useState } from "react";
import { Select, Button, Table, Space, Modal, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";

/* =========================
   TYPES
========================= */
type HostGroup = { groupid: string; name: string };
type Host = { hostid: string; name: string };

type TableRow = {
  key: string;
  itemid: string;
  host: string;
  name: string;
  lastValue: string;
  lastCheck: string;
  change: string;
};

/* =========================
   AXIOS CONFIG
========================= */
const axiosCfg = {
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer f367bb14b4c8d2cc37da595aabc75950",
  },
};

export default function LatestDataPage() {
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  /* ===== HISTORY MODAL ===== */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);

  /* =========================
     HOST GROUPS
  ========================= */
  const loadHostGroups = async () => {
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
  const loadHosts = async (groups: string[]) => {
    if (!groups.length) {
      setHosts([]);
      return;
    }

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
     APPLY (LATEST DATA)
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
          host: i.hosts?.[0]?.name ?? "-",
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

  /* =========================
     OPEN HISTORY (VIEW BUTTON)
  ========================= */
  const openHistory = async (itemid: string, name: string) => {
    setHistoryTitle(name);
    setHistoryOpen(true);
    setHistoryLoading(true);

    const payload = {
      jsonrpc: "2.0",
      method: "history.get",
      params: {
        output: "extend",
        history: 0, // numeric float (CPU etc.)
        itemids: [itemid],
        sortfield: "clock",
        sortorder: "DESC",
        limit: 100,
      },
      id: 10,
    };

    try {
      const res = await axios.post("/api/zabbix-proxy", payload, axiosCfg);
      setHistoryData(res.data.result ?? []);
    } catch {
      message.error("history.get failed");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHostGroups();
  }, []);

  /* =========================
     TABLE COLUMNS
  ========================= */
  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 160 },
    { title: "Item", dataIndex: "name", width: 280 },
    { title: "Last Value", dataIndex: "lastValue", width: 120 },
    { title: "Last Check", dataIndex: "lastCheck", width: 180 },
    { title: "Change", dataIndex: "change", width: 100 },
    {
      title: "History",
      width: 90,
      render: (_, row) => (
        <Button size="small" onClick={() => openHistory(row.itemid, row.name)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Space>
        <Select
          mode="multiple"
          allowClear
          placeholder="Host Groups"
          style={{ width: 260 }}
          options={hostGroups.map((g) => ({
            label: g.name,
            value: g.groupid,
          }))}
          value={selectedGroups}
          onChange={(groupIds) => {
            setSelectedGroups(groupIds);
            setSelectedHosts([]);
            loadHosts(groupIds);
          }}
        />

        <Select
          mode="multiple"
          allowClear
          placeholder="Hosts"
          style={{ width: 260 }}
          options={hosts.map((h) => ({
            label: h.name,
            value: h.hostid,
          }))}
          value={selectedHosts}
          onChange={setSelectedHosts}
          disabled={!selectedGroups.length}
        />

        <Button
          type="primary"
          onClick={handleApply}
          disabled={!selectedHosts.length}
        >
          Apply
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={tableData}
        loading={loadingTable}
        size="small"
        scroll={{ x: true }}
      />

      {/* ================= HISTORY MODAL ================= */}
      <Modal
        title={`vmanage-0 – ${historyTitle}`}
        open={historyOpen}
        onCancel={() => setHistoryOpen(false)}
        footer={null}
        width={520}
      >
        <Table
          size="small"
          loading={historyLoading}
          pagination={false}
          columns={[
            {
              title: "Time",
              dataIndex: "clock",
              render: (v) => new Date(v * 1000).toLocaleString(),
            },
            {
              title: "Value",
              dataIndex: "value",
              render: (v) => Number(v).toFixed(2),
            },
          ]}
          dataSource={historyData.map((r: any) => ({
            key: r.clock,
            clock: r.clock,
            value: r.value,
          }))}
        />
      </Modal>
    </Space>
  );
}
