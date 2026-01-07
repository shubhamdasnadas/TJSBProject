"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Table, Button } from "antd";
import branches from "../data/data";
import { useRouter } from "next/navigation";

type IpRow = {
  hostname: string;
  systemIp: string;
  branchName: string;
  tunnels: any[];
  rowState: "up" | "down" | "partial";
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
  const router = useRouter();

  async function load() {
    try {
      const res = await axios.post("/api/sdwan/tunnels");

      const devices = res.data.devices || {};

      const final: IpRow[] = Object.entries(devices).map(
        ([systemIp, tunnels]: any) => {
          const first = tunnels[0];
          const hostname = first?.hostname || "NA";
          const branchName = getBranchNameByHostname(hostname);

          const sortedTunnels = tunnels.sort((a: any, b: any) => {
            const priority = (v: string) =>
              v === "down" ? 0 : v === "up" ? 1 : 2;

            return priority(a.state) - priority(b.state);
          });

          const allUp = sortedTunnels.every((t: any) => t.state === "up");
          const allDown = sortedTunnels.every((t: any) => t.state === "down");

          let rowState: "up" | "down" | "partial" = "partial";
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

  async function handleExport() {
    try {
      const res = await axios.post("/api/sdwan/tunnels");

      // store full api response
      localStorage.setItem("exportData", JSON.stringify(res.data));

      // go to preview page
      router.push("/preview");
    } catch (e) {
      console.error("EXPORT ERROR:", e);
    }
  }

  const columns: any = [
    {
      title: "Branch",
      dataIndex: "branchName",
      key: "branchName",
      render: (_: any, row: IpRow) => {
        let bg = "#ddd";
        let color = "#000";

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
              padding: "4px 10px",
              borderRadius: 6,
              background: bg,
              color,
              fontWeight: 700,
            }}
          >
            {row.branchName}
          </span>
        );
      },
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
    {
      title: "Tunnels (Name + Uptime)",
      key: "tunnelInfo",
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
              {t.tunnelName} — {t.uptime}
            </option>
          ))}
        </select>
      ),
    },
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">SD-WAN — Tunnel Status by IP</h1>

        <Button type="primary" onClick={handleExport}>
          Export / Preview
        </Button>
      </div>

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
