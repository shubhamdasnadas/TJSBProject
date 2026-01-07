"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Table } from "antd";
import branches from "../data/data";

type TunnelRow = {
  hostname: string;
  vdeviceIP: string;
  color: string;
  primary_color: string;
  state: string;
  branchName: string;
  hostRowSpan?: number;
  deviceRowSpan?: number;
};

// 🔹 match branch ONLY with hostname
function getBranchNameByHostname(hostname: string) {
  if (!hostname) return "Unknown";

  const found = branches.find((b: any) =>
    hostname.toLowerCase().includes(b.code?.toLowerCase())
  );

  return found ? found.name : "Unknown";
}

export default function TunnelsPage() {
  const [data, setData] = useState<TunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await axios.post("/api/sdwan/tunnels");

      const bfd = res.data.api.bfdSessions || [];

      let sessionRows: TunnelRow[] = bfd.flatMap((item: any) => {
        const hostname = item.hostname;
        const systemIp = item.systemIp;

        const branchName = getBranchNameByHostname(hostname);

        // no sessions
        if (!item.sessions || item.sessions.length === 0) {
          return [
            {
              hostname,
              vdeviceIP: systemIp,
              color: "NA",
              primary_color: "NA",
              state: "no-session",
              branchName,
            },
          ];
        }

        // normal sessions
        return item.sessions.map((s: any) => ({
          hostname,
          vdeviceIP: systemIp,
          color: s["color"] || "NA",
          primary_color: s["local-color"] || "NA",
          state: s["state"] || "unknown",
          branchName,
        }));
      });

      // sort (down → up → others)
      sessionRows = sessionRows.sort((a, b) => {
        const priority = (v: string) =>
          v === "down" ? 0 : v === "up" ? 1 : 2;

        return priority(a.state) - priority(b.state);
      });

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

  // group by hostname + device
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
      title: "Branch",
      dataIndex: "branchName",
      key: "branchName",
    },
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
        rowKey={(r) => `${r.hostname}-${r.vdeviceIP}-${r.color}`}
      />
    </div>
  );
}
