"use client";

import { useEffect, useState } from "react";
import { Card, Table, message } from "antd";
import axios from "axios";

// =========================
// Types (Match Backend)
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
// Component
// =========================
const HostTable = () => {
  const [data, setData] = useState<HostItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔑 Example values (replace with real ones)
  const auth = localStorage.getItem("zabbix_auth"); // bearer token
  const groupid = []; // e.g. ["12", "15"]

  // =========================
  // API CALL FUNCTION
  // =========================
  const fetchHosts = async () => {
    try {
      setLoading(true);

      const res = await axios.post("/api/inventory/get_host", {
        auth,
      });
      console.log("Host data response:", res.data);
      setData(res.data?.result || []);
    } catch (err) {
      message.error("Failed to load host data");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ON LOAD
  // =========================
  useEffect(() => {
    fetchHosts();
  }, []);

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    // {
    //   title: "Host",
    //   dataIndex: "host",
    //   key: "host",
    // },
    {
      title: "Host Name",
      dataIndex: "hostName",
      key: "hostName",
    },
    {
      title: "Host Groups",
      key: "hostGroups",
      render: (_: any, record: HostItem) =>
        record.hostGroups.length
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
    <Card title="Zabbix Hosts">
      <Table
        rowKey="hostid"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 10 }}
      />
    </Card>
  );
};

export default HostTable;
