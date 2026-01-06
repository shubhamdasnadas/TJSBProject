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

      const apiRows = res?.data?.data?.data || [];

      console.log("RAW API ROWS:", apiRows);

      // ---- TRANSFORM + REMOVE DUPLICATES ----
      const map = new Map();

      const transformed = apiRows.map((row: any) => ({
        hostname: row["vdevice-host-name"],
        vdeviceIP: row["vdevice-name"],
        color: row["color"],
        primary_color: row["local-color"],
        state: row["state"],
      }));

      // Deduplicate by hostname + vdeviceIP
      transformed.forEach((r:any) => {
        const key = `${r.hostname}|${r.vdeviceIP}`;
        if (!map.has(key)) map.set(key, r);
      });

      setData(Array.from(map.values()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const columns = [
    {
      title: "vdevice-host-name",
      dataIndex: "hostname",
      key: "hostname",
    },
    {
      title: "vdevice-name",
      dataIndex: "vdeviceIP",
      key: "vdeviceIP",
    },
    {
      title: "color",
      dataIndex: "color",
      key: "color",
    },
    {
      title: "local-color",
      dataIndex: "primary_color",
      key: "primary_color",
      render: (v: any) => v || "NA",
    },
    {
      title: "state",
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
          `${row.hostname}-${row.vdeviceIP}-${row.color}`
        }
        bordered
        pagination={false}
      />
    </div>
  );
}
