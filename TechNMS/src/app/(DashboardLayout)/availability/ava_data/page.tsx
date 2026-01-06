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

      // ---- DEVICE MAP (unique per host + device) ----
      const devices = new Map();

      apiRows.forEach((row: any) => {
        const hostname = row["vdevice-host-name"];
        const vdeviceIP = row["vdevice-name"];
        const state = row["state"];

        const key = `${hostname}|${vdeviceIP}`;

        if (!devices.has(key)) {
          devices.set(key, {
            hostname,
            vdeviceIP,
            state: state === "down" ? "down" : "up",
          });
        } else {
          const existing = devices.get(key);

          // if any tunnel is down, mark entire device down
          if (state === "down") {
            existing.state = "down";
          }

          devices.set(key, existing);
        }
      });

      setData(Array.from(devices.values()));
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
      title: "Host",
      dataIndex: "hostname",
      key: "hostname",
    },
    {
      title: "Device",
      dataIndex: "vdeviceIP",
      key: "vdeviceIP",
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      render: (state: string) =>
        state === "down" ? (
          <span style={{ color: "red", fontWeight: "bold" }}>down</span>
        ) : (
          <span style={{ color: "green", fontWeight: "bold" }}>up</span>
        ),
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">SD-WAN Devices</h1>

      <Table
        loading={loading}
        columns={columns}
        dataSource={data}
        bordered
        pagination={false}
        rowKey={(row) => `${row.hostname}-${row.vdeviceIP}`}
        rowClassName={(record: any) =>
          record.state === "down" ? "bg-red-100" : "bg-green-100"
        }
      />
    </div>
  );
}
