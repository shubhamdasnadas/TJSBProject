"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Table } from "antd";
import branches from "../data/data";

type IpRow = {
  hostname: string;
  systemIp: string;
  branchName: string;
  tunnels: any[];
  rowState: "up" | "down" | "mixed";
};

function getBranchNameByHostname(hostname: string) {
  if (!hostname) return "Unknown";

  const found = branches.find((b: any) =>
    hostname.toLowerCase().includes(b.code?.toLowerCase())
  );

  return found ? found.name : "Unknown";
}

export default function TunnelsPage() {
  const [rows, setRows] = useState<IpRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await axios.post("/api/sdwan/tunnels");
      console.log(res);
      const devices = res.data.api.devices || {};

      const final: IpRow[] = Object.entries(devices).map(
        ([systemIp, tunnels]: any) => {
          const first = tunnels[0];

          const hostname = first?.hostname || "NA";

          const branchName = getBranchNameByHostname(hostname);

          // sort tunnels (down first)
          const sortedTunnels = tunnels.sort((a: any, b: any) => {
            const priority = (v: string) =>
              v === "down" ? 0 : v === "up" ? 1 : 2;

            return priority(a.state) - priority(b.state);
          });

          // compute row state
          const allUp = sortedTunnels.every((t: any) => t.state === "up");
          const allDown = sortedTunnels.every((t: any) => t.state === "down");

          let rowState: "up" | "down" | "mixed" = "mixed";
          if (allUp) rowState = "up";
          if (allDown) rowState = "down";

          return {
            hostname,
            systemIp,
            branchName,
            tunnels: sortedTunnels,
            rowState,
          };
        }
      );

      setRows(final);
    } catch (e) {
      console.error("FRONTEND ERROR:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const columns: any = [
    {
      title: "Branch",
      dataIndex: "branchName",
      key: "branchName",
    },
    {
      title: "Hostname",
      dataIndex: "hostname",
      key: "hostname",
    },
    {
      title: "System IP",
      dataIndex: "systemIp",
      key: "systemIp",
    },

    // LOCAL COLOR DROPDOWN
    {
      title: "Local Color",
      key: "localColor",
      render: (_: any, row: IpRow) => (
        <select style={{ padding: 4 }}>
          {row.tunnels.map((t: any, i: number) => (
            <option
              key={i}
              style={{
                color: t.state === "down" ? "red" : "black",
                fontWeight: t.state === "down" ? 700 : 400,
              }}
            >
              {t.localColor} ({t.state})
            </option>
          ))}
        </select>
      ),
    },

    // REMOTE COLOR DROPDOWN
    {
      title: "Remote Color",
      key: "remoteColor",
      render: (_: any, row: IpRow) => (
        <select style={{ padding: 4 }}>
          {row.tunnels.map((t: any, i: number) => (
            <option
              key={i}
              style={{
                color: t.state === "down" ? "red" : "black",
                fontWeight: t.state === "down" ? 700 : 400,
              }}
            >
              {t.remoteColor} ({t.state})
            </option>
          ))}
        </select>
      ),
    },

    // STATE COLUMN (DEPENDS ON ALL TUNNELS)
    {
      title: "State",
      key: "state",
      render: (_: any, row: IpRow) => {
        let bg = "#ccc";
        let color = "black";

        if (row.rowState === "up") {
          bg = "#d7ffd7";
          color = "green";
        }

        if (row.rowState === "down") {
          bg = "#ffd6d6";
          color = "red";
        }

        return (
          <span
            style={{
              padding: "2px 10px",
              borderRadius: 6,
              background: bg,
              color,
              fontWeight: 700,
            }}
          >
            {row.rowState}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">
        SD-WAN — Tunnel Status by IP
      </h1>

      <Table
        loading={loading}
        columns={columns}
        dataSource={rows}
        bordered
        pagination={false}
        rowKey={(r) => r.systemIp}
      />
    </div>
  );
}
