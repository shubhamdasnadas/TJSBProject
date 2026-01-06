"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Table } from "antd";

type TunnelRow = {
  hostname: string;
  vdeviceIP: string;
  color: string;
  primary_color: string;
  state: string;
  hostRowSpan?: number;
  deviceRowSpan?: number;
};

export default function TunnelsPage() {
  const [data, setData] = useState<TunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await axios.post("/api/sdwan/tunnels");

      console.log("🔁 BFD SESSIONS:", res.data.api.bfdSessions);

      const bfd = res.data.api.bfdSessions || [];

      // FLATTEN sessions
      const sessionRows: TunnelRow[] = bfd.flatMap((item: any) =>
        (item.sessions || []).map((s: any) => ({
          hostname: s["vdevice-host-name"] || "NA",
          vdeviceIP: item.deviceId,
          color: s["color"] || "NA",
          primary_color: s["local-color"] || "NA",
          state: s["state"] || "unknown",
        }))
      );

      setData(sessionRows);
    } catch (e) {
      console.error("FRONTEND ERROR:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // group host + device
  const grouped = data.reduce<Record<string, TunnelRow[]>>((acc, item) => {
    const key = `${item.hostname}-${item.vdeviceIP}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const finalRows: TunnelRow[] = [];

  Object.values(grouped).forEach((group) => {
    group.forEach((row, index) => {
      finalRows.push({
        ...row,
        hostRowSpan: index === 0 ? group.length : 0,
        deviceRowSpan: index === 0 ? group.length : 0,
      });
    });
  });

  const columns: any = [
    {
      title: "hostname",
      dataIndex: "hostname",
      key: "hostname",
      onCell: (row: TunnelRow) => ({
        rowSpan: row.hostRowSpan,
      }),
    },
    {
      title: "VdeviceIP",
      dataIndex: "vdeviceIP",
      key: "vdeviceIP",
      onCell: (row: TunnelRow) => ({
        rowSpan: row.deviceRowSpan,
      }),
    },
    {
      title: "color",
      dataIndex: "color",
      key: "color",
    },
    {
      title: "primary color",
      dataIndex: "primary_color",
      key: "primary_color",
    },
    {
      title: "state",
      dataIndex: "state",
      key: "state",
      render: (state: string) => (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 6,
            background: state === "up" ? "#d7ffd7" : "#ffd6d6",
            color: state === "up" ? "green" : "red",
            fontWeight: 600,
          }}
        >
          {state}
        </span>
      ),
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">SD-WAN BFD Sessions</h1>

      <Table
        loading={loading}
        columns={columns}
        dataSource={finalRows}
        bordered
        pagination={false}
      />
    </div>
  );
}
