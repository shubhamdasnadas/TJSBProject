"use client";

import { useEffect, useRef, useState } from "react";
import { Table } from "antd";
import branches from "../(DashboardLayout)/availability/data/data";
import { ISP_BRANCHES } from "../(DashboardLayout)/availability/data/data";
import Certificate from "./widget/cardDashboard/certificate/page";
import Vmanage from "./widget/cardDashboard/vmanage/page";

const CACHE_KEY = "sdwan_tunnel_cache";
const AUTO_REFRESH_MS = 60 * 1000;

/* ===================== TYPES ===================== */
type IpRow = {
  hostname: string;
  systemIp: string;
  branchName: string;
  tunnels: any[];
  rowState: "up" | "down" | "partial";
};

/* ===================== HELPERS ===================== */
function getBranchNameByHostname(hostname: string) {
  if (!hostname) return "Unknown";
  const found = branches.find((b: any) =>
    hostname.toLowerCase().includes(b.code?.toLowerCase())
  );
  return found ? found.name : "Unknown";
}

function resolveIspName(text: string) {
  if (!text) return text;
  let result = text;
  ISP_BRANCHES.forEach((isp) => {
    const type = isp.type.toLowerCase();
    if (result.toLowerCase().includes(type)) {
      result = result.replace(new RegExp(type, "gi"), isp.name);
    }
  });
  return result;
}

/* ===================== JSON → TABLE ===================== */
function transformJsonToRows(json: any): IpRow[] {
  const devices = json?.devices ?? {};
  const rows: IpRow[] = [];

  Object.entries(devices).forEach(([systemIp, tunnels]: any) => {
    if (!Array.isArray(tunnels) || tunnels.length === 0) return;

    const hostname = tunnels[0]?.hostname ?? "Unknown";
    const upCount = tunnels.filter((t: any) => t.state === "up").length;
    const downCount = tunnels.filter((t: any) => t.state === "down").length;

    let rowState: "up" | "down" | "partial" = "partial";
    if (upCount === tunnels.length) rowState = "up";
    else if (downCount === tunnels.length) rowState = "down";

    rows.push({
      hostname,
      systemIp,
      branchName: getBranchNameByHostname(hostname),
      tunnels,
      rowState,
    });
  });

  const priority = { down: 0, partial: 1, up: 2 };
  rows.sort((a, b) => priority[a.rowState] - priority[b.rowState]);

  return rows;
}

/* ===================== COMPONENT ===================== */
export default function DashboardTunnel({ mode = "page" }: { mode?: "page" | "widget" }) {
  const [rows, setRows] = useState<IpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const [time, setTime] = useState({ hh: "00", mm: "00", ss: "00" });

  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setRows(JSON.parse(cached));
        setLoading(false);
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }
  }, []);

  async function load() {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/sdwan/tunnels");
      const json = await res.json();

      if (json.generatedAt) {
        const d = new Date(json.generatedAt);
        setTime({
          hh: String(d.getHours()).padStart(2, "0"),
          mm: String(d.getMinutes()).padStart(2, "0"),
          ss: String(d.getSeconds()).padStart(2, "0"),
        });
      }

      const data = transformJsonToRows(json);
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setRows(data);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  /* ===================== TABLE ===================== */
  const columns: any = [
    {
      title: "Branch",
      render: (_: any, row: IpRow) => {
        const map: any = {
          up: ["#d7ffd7", "green"],
          down: ["#ffd6d6", "red"],
          partial: ["#ffe5b4", "orange"],
        };
        const [bg, color] = map[row.rowState];
        return (
          <span style={{ padding: "4px 10px", borderRadius: 6, background: bg, color, fontWeight: 700 }}>
            {getBranchNameByHostname(row.hostname)}
          </span>
        );
      },
    },
    { title: "Hostname", dataIndex: "hostname" },
    { title: "System IP", dataIndex: "systemIp" },

    /* ✅ FINAL FIXED DROPDOWN */
    {
      title: "Tunnels (Name + Uptime)",
      render: (_: any, row: IpRow) => {
        const downTunnels = row.tunnels.filter((t: any) => t.state === "down");
        const upTunnels = row.tunnels.filter((t: any) => t.state === "up");

        const bg = downTunnels.length > 0 ? "#ffd6d6" : "#d7ffd7";

        return (
          <select
            style={{
              padding: 6,
              width: "100%",
              background: bg,
              fontWeight: 700,
              borderRadius: 4,
            }}
          >
            {downTunnels.length > 0 && (
                downTunnels.map((t: any, i: number) => (
                  <option key={`down-${i}`} style={{backgroundColor:"#ffd6d6"}}>
                    {resolveIspName(t.tunnelName)} — {t.uptime}
                  </option>
                ))
            )}

            {upTunnels.length > 0 && (
                upTunnels.map((t: any, i: number) => (
                  <option key={`up-${i}`} style={{backgroundColor:"#d7ffd7"}}>
                    {resolveIspName(t.tunnelName)} — {t.uptime}
                  </option>
                ))
            )}
          </select>
        );
      },
    },

    {
      title: "State",
      render: (_: any, row: IpRow) => {
        const map: any = {
          up: ["#d7ffd7", "green"],
          down: ["#ffd6d6", "red"],
          partial: ["#ffe5b4", "orange"],
        };
        const [bg, color] = map[row.rowState];
        return (
          <span style={{ padding: "2px 10px", borderRadius: 6, background: bg, color, fontWeight: 700 }}>
            {row.rowState}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, fontWeight: 600 }}>
        Updated on : {time.hh}:{time.mm}:{time.ss}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Vmanage />
          <Certificate />
        </div>
      </div>

      <Table
        loading={loading}
        columns={columns}
        dataSource={rows}
        bordered
        pagination={false}
        rowKey={(r) => r.systemIp}
        size={mode === "widget" ? "small" : "middle"}
      />
    </>
  );
}
