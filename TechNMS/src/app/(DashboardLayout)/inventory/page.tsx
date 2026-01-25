"use client";

import { useEffect, useState, useRef } from "react";
import { Card, Select, Table, message } from "antd";
import axios from "axios";
import useZabbixData from "../../(DashboardLayout)/widget/three";
import branches from "../availability/data/data";

/* =========================
Types
========================= */

interface HostGroup {
  groupid: string;
  name: string;
}

interface Host {
  hostid: string;
  name: string;
}

interface Inventory {
  os?: string;
  serialno_a?: string;
  model?: string;           // ✅ ADDED
  software_full?: string;   // ✅ ADDED
}

interface HostItem {
  hostid: string;
  host: string;
  hostName: string;
  hostGroups: HostGroup[];
  inventory: Inventory;
}

/* =========================
Constants
========================= */

const CACHE_KEY = "zabbix_inventory_cache";

/* =========================
Component
========================= */

const HostTable = () => {
  const [data, setData] = useState<HostItem[]>([]);
  const [tableData, setTableData] = useState<HostItem[]>([]);
  const [loading, setLoading] = useState(false);

  const { hostGroups, fetchZabbixData } = useZabbixData();

  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>();
  const [selectedHost, setSelectedHost] = useState<string>();

  const fetchingRef = useRef(false);

  const auth =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  /* =========================
  HELPERS
  ========================= */

  function getBranchName(hostname: string) {
    if (!hostname) return "NA";
    const found = branches.find((b: any) =>
      hostname.toLowerCase().includes(b.code?.toLowerCase())
    );
    return found?.name || "NA";
  }

  /* =========================
  LOAD FROM CACHE
  ========================= */

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setData(parsed);
        setTableData(parsed);
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  /* =========================
  FETCH INVENTORY
  ========================= */

  const fetchInventory = async () => {
    if (!auth || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    try {
      const res = await axios.post("/api/inventory/get_host", { auth });
      const result: HostItem[] = res.data?.result || [];

      if (result.length) {
        setData(result);
        setTableData(result);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
      }
    } catch {
      message.error("Failed to refresh host data");
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  /* =========================
  DROPDOWNS
  ========================= */

  const onGroupChange = async (groupId?: string) => {
    setSelectedGroup(groupId);
    setSelectedHost(undefined);

    if (!groupId) {
      setHosts([]);
      setTableData(data);
      return;
    }

    const hostList = await fetchZabbixData("host", [groupId]);
    setHosts(hostList || []);
    setTableData([]);
  };

  const onHostChange = (hostId?: string) => {
    setSelectedHost(hostId);

    if (!hostId || hostId === "__ALL__") {
      setTableData(data);
      return;
    }

    const filtered = data.filter(
      (h) => h.hostid === hostId || h.host === hostId
    );
    setTableData(filtered);
  };

  /* =========================
  TABLE COLUMNS
  ========================= */

  const columns = [
    {
      title: "Host Name",
      dataIndex: "hostName",
      key: "hostName",
    },
    {
      title: "Branch",
      key: "branch",
      render: (_: any, record: HostItem) =>
        getBranchName(record.hostName),
    },
    {
      title: "Host Groups",
      key: "hostGroups",
      render: (_: any, record: HostItem) =>
        record.hostGroups?.length
          ? record.hostGroups.map((g) => g.name).join(", ")
          : "-",
    },
    {
      title: "OS",
      key: "os",
      render: (_: any, record: HostItem) =>
        record.inventory?.os || "-",
    },
    {
      title: "Serial No",
      key: "serial",
      render: (_: any, record: HostItem) =>
        record.inventory?.serialno_a || "-",
    },
    {
      title: "Model",
      key: "model",
      render: (_: any, record: HostItem) =>
        record.inventory?.model || "-", // ✅ FIXED
    },
    {
      title: "Software Full",
      key: "software_full",
      render: (_: any, record: HostItem) =>
        record.inventory?.software_full || "-", // ✅ FIXED
    },
  ];

  /* =========================
  UI
  ========================= */

  return (
    <Card>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>
        Inventory Hosts
      </h2>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <Select
          placeholder="Select Host Group"
          style={{ width: 300 }}
          options={hostGroups.map((g) => ({
            label: g.name,
            value: g.groupid,
          }))}
          value={selectedGroup}
          onChange={onGroupChange}
          allowClear
        />

        <Select
          placeholder="Select Host"
          style={{ width: 300 }}
          disabled={!hosts.length}
          value={selectedHost}
          onChange={onHostChange}
          allowClear
          options={[
            { label: "Select All", value: "__ALL__" },
            ...hosts.map((h) => ({
              label: h.name,
              value: h.hostid,
            })),
          ]}
        />
      </div>

      <Table
        rowKey="hostid"
        loading={loading}
        columns={columns}
        dataSource={tableData}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default HostTable;
