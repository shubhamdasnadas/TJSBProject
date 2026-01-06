"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Table } from "antd";

export default function TunnelsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await axios.post("/api/sdwan/tunnels");

      console.log("BACKEND DEBUG:", res.data.debug);
      console.log("API DATA:", res.data.data);

      // usually Cisco returns: { data: [ ...rows ] }
      setData(res?.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Ant Design column definitions
  const columns = [
    {
      title: "Hostname",
      dataIndex: "hostname",
      key: "hostname",
    },
    {
      title: "vDevice IP",
      dataIndex: "vdeviceIP",
      key: "vdeviceIP",
    },
    {
      title: "Color",
      dataIndex: "color",
      key: "color",
    },
    {
      title: "Primary Color",
      dataIndex: "primary_color",
      key: "primary_color",
      render: (v: any) => v || "NA",
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">SD-WAN Tunnel Status</h1>

      <Table
        loading={loading}
        columns={columns}
        dataSource={data}
        rowKey={(row: any) =>
          `${row.hostname}-${row.vdeviceIP}-${row.color}-${Math.random()}`
        }
        bordered
        pagination={false}
      />
    </div>
  );
}
