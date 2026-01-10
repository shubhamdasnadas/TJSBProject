"use client";

import { useEffect, useState, useRef } from "react";
import { Card, Table, message } from "antd";
import axios from "axios";

// =========================
// Types
// =========================
interface HostGroup {
  name: string;
}

interface Inventory {
  os?: string;
  serialno_a?: string;
}

interface HostItem {
  hostid: string;
  host: string;
  hostName: string;
  hostGroups: HostGroup[];
  inventory: Inventory;
}

// =========================
// Constants
// =========================
const CACHE_KEY = "zabbix_inventory_cache";

// =========================
// Component
// =========================
const HostTable = () => {
  const [data, setData] = useState<HostItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔒 Prevent duplicate API calls on rapid remounts
  const fetchingRef = useRef(false);

  const auth =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  // =========================
  // LOAD FROM CACHE FIRST
  // =========================
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setData(JSON.parse(cached));
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  // =========================
  // API CALL (STALE-WHILE-REVALIDATE)
  // =========================
  const fetchHosts = async () => {
    if (!auth || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    try {
      const res = await axios.post("/api/inventory/get_host", { auth });

      const result: HostItem[] = res.data?.result || [];

      // ✅ Update only if data is valid
      if (result.length) {
        setData(result);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(result));
      }
    } catch (err) {
      message.error("Failed to refresh host data");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // =========================
  // FETCH ON MOUNT (BACKGROUND)
  // =========================
  useEffect(() => {
    fetchHosts();
  }, []);

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      title: "Host Name",
      dataIndex: "hostName",
      key: "hostName",
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
  ];

  return (
    <Card>
      <Table
        rowKey="hostid"
        loading={loading && data.length === 0} // 🔥 no flicker
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default HostTable;
