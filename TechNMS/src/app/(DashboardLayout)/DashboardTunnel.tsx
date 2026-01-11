"use client";

import { useEffect, useRef, useState } from "react";
import { Table, Button, Modal } from "antd";
import branches from "../(DashboardLayout)/availability/data/data";
import { ISP_BRANCHES } from "../(DashboardLayout)/availability/data/data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadTunnels } from "@/utils/loadTunnels";

const CACHE_KEY = "sdwan_tunnel_cache";

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

/**
 * ✅ Normalize tunnel ISP name using ISP_BRANCHES
 * Does NOT affect existing logic
 */
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

interface Props {
  mode?: "page" | "widget";
}

export default function DashboardTunnel({ mode = "page" }: Props) {
  const [rows, setRows] = useState<IpRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchingRef = useRef(false);

  /* ============== LOAD CACHE (INITIAL) ============== */
  useEffect(() => {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setRows(JSON.parse(cached));
        setLoading(false); // ✅ stop loader if cache exists
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
      const tunnelRows = await loadTunnels();
      const cached = JSON.stringify(tunnelRows);
      if (!cached) {
        setRows([]);
        return;
      }

      const data: IpRow[] = JSON.parse(cached);

      const order = { down: 0, partial: 1, up: 2 };
      data.sort((a, b) => order[a.rowState] - order[b.rowState]);

      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setRows(data);
    } catch (e) {
      console.error("FRONTEND ERROR:", e);
      setRows([]);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  /* ============== INITIAL API LOAD ============== */
  useEffect(() => {
    load();
  }, []);

  /* ============== TAB / BAR OPEN–CLOSE FIX ============== */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            setRows(JSON.parse(cached));
            setLoading(false); // ✅ no spinner on return
          } catch {
            sessionStorage.removeItem(CACHE_KEY);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
  }, []);

  /* ============== PRELOAD (UNCHANGED) ============== */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          setRows(JSON.parse(cached));
          setLoading(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
  }, []);

  const columns: any = [
    {
      title: "Branch",
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
        if (row.rowState === "partial") {
          bg = "#ffe5b4";
          color = "orange";
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
            {getBranchNameByHostname(row.hostname)}
          </span>
        );
      },
    },
    { title: "Hostname", dataIndex: "hostname" },
    { title: "System IP", dataIndex: "systemIp" },
    {
      title: "Tunnels (Name + Uptime)",
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
              {resolveIspName(t.tunnelName)} — {t.uptime}
            </option>
          ))}
        </select>
      ),
    },
    {
      title: "State",
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
        if (row.rowState === "partial") {
          bg = "#ffe5b4";
          color = "orange";
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
    <Table
      loading={loading}
      columns={columns}
      dataSource={rows}
      bordered
      pagination={false}
      rowKey={(r) => r.systemIp}
      size={mode === "widget" ? "small" : "middle"}
    />
  );
}
