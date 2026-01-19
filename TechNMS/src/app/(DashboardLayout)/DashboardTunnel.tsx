"use client";

import { useEffect, useRef, useState } from "react";
import { Col, Row, Table, notification, Card } from "antd";
import branches from "../(DashboardLayout)/availability/data/data";
import { ISP_BRANCHES } from "../(DashboardLayout)/availability/data/data";
import Certificate from "./widget/cardDashboard/certificate/page";
import Vmanage from "./widget/cardDashboard/vmanage/page";
import ProblemsSummaryTable from "./widget/cardDashboard/problemsummarycount";

const CACHE_KEY = "sdwan_tunnel_cache";
const AUTO_REFRESH_MS = 60 * 1000;
const NOTIFICATION_DELAY_MS = 10000;

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

/* ===================== JSON → TABLE (FIXED: KEEP EMPTY TUNNELS) ===================== */
function transformJsonToRows(json: any): IpRow[] {
  const devices = json?.sites ?? {};
  const rows: IpRow[] = [];

  Object.entries(devices).forEach(([systemIp, site]: any) => {
    const hostname = site?.hostname ?? "Unknown";
    const tunnels = Array.isArray(site?.tunnels) ? site.tunnels : [];

    let rowState: "up" | "down" | "partial" = "down";

    if (tunnels.length > 0) {
      const upCount = tunnels.filter((t: any) => t.state === "up").length;
      const downCount = tunnels.filter((t: any) => t.state === "down").length;

      if (upCount === tunnels.length) rowState = "up";
      else if (downCount === tunnels.length) rowState = "down";
      else rowState = "partial";
    }

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

/* ===================== BACKGROUND COLOR ===================== */
function getBgForTunnel(tunnel: any) {
  if (!tunnel) return "#ffd6d6"; // empty → treat as DOWN
  if (tunnel.state === "down") return "#ffd6d6";
  if (tunnel.state === "up") return "#d7ffd7";
  return "#ffe5b4";
}

/* ===================== COMPONENT ===================== */
export default function DashboardTunnel({
  mode = "page",
}: {
  mode?: "page" | "widget";
}) {
  const [rows, setRows] = useState<IpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const [time, setTime] = useState({ hh: "00", mm: "00", ss: "00" });

  const [api, contextHolder] = notification.useNotification();

  const branchNotifyRef = useRef<Record<string, boolean>>({});
  const queueRef = useRef<any[]>([]);
  const isProcessingRef = useRef(false);

  const playSound = () => {
    const audio = new Audio("/images/sound/soundalert.mp3");
    audio.volume = 1;
    audio.play().catch(() => { });
  };

  const processQueue = () => {
    if (isProcessingRef.current) return;
    if (queueRef.current.length === 0) return;

    isProcessingRef.current = true;
    const item = queueRef.current.shift();

    playSound();

    api.open({
      type: "error",
      duration: 8,
      message: (
        <div style={{ fontWeight: 700 }}>
          {item.branch} — {item.systemIp}
        </div>
      ),
      description: (
        <div>
          {item.downTunnels.map((t: string, i: number) => (
            <div
              key={i}
              style={{ color: "red", fontWeight: 600, marginBottom: 4 }}
            >
              • {item.systemIp}:{t}
            </div>
          ))}
        </div>
      ),
    });

    setTimeout(() => {
      isProcessingRef.current = false;
      processQueue();
    }, NOTIFICATION_DELAY_MS);
  };

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

      data.forEach((row) => {
        const key = `${row.branchName}_${row.systemIp}`;
        if (branchNotifyRef.current[key]) return;

        const downTunnels = row.tunnels.filter((t) => t.state === "down");

        if (row.tunnels.length === 0 || downTunnels.length > 0) {
          branchNotifyRef.current[key] = true;

          queueRef.current.push({
            branch: row.branchName,
            systemIp: row.systemIp,
            downTunnels:
              row.tunnels.length === 0
                ? ["NA"]
                : downTunnels.map((t) => resolveIspName(t.tunnelName)),
          });

          processQueue();
        }
      });

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

  /* ===================== BASE COLUMNS ===================== */
  const baseColumns: any = [
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
      render: (_: any, row: IpRow) => {
        const sortedTunnels =
          row.tunnels.length > 0
            ? [...row.tunnels].sort((a: any, b: any) => {
              if (a.state === "down" && b.state !== "down") return -1;
              if (a.state !== "down" && b.state === "down") return 1;
              return 0;
            })
            : [];

        const selectedTunnel = sortedTunnels[0];
        const isDown =
          row.tunnels.length === 0 || selectedTunnel?.state === "down";

        return (
          <select
            style={{
              padding: 6,
              width: "100%",
              background: isDown ? "#ffd6d6" : "#d7ffd7",
              fontWeight: 700,
              borderRadius: 4,
            }}
          >
            {row.tunnels.length === 0 ? (
              <option style={{ backgroundColor: "#ffd6d6", fontWeight: 700 }}>
                NA
              </option>
            ) : (
              sortedTunnels.map((t: any, i: number) => (
                <option
                  key={i}
                  value={t.tunnelName}
                  style={{
                    backgroundColor:
                      t.state === "down" ? "#ffd6d6" : "#d7ffd7",
                    fontWeight: t.state === "down" ? 700 : 500,
                  }}
                >
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

  const FIXED_FIRST_TABLE_IPS = [
    "192.168.222.1",
    "192.168.222.2",
    "192.168.222.3",
    "192.168.222.4",
  ];

  const table1Rows = rows.filter((r) =>
    FIXED_FIRST_TABLE_IPS.includes(r.systemIp)
  );

  const table2Rows = rows.filter(
    (r) => !FIXED_FIRST_TABLE_IPS.includes(r.systemIp)
  );

  const sortTunnels = (list: any[]) =>
    [...list].sort((a, b) => {
      if (a.state === "down" && b.state !== "down") return -1;
      if (a.state !== "down" && b.state === "down") return 1;
      return 0;
    });

  const table2Columns: any = [
    baseColumns[0],
    baseColumns[1],
    baseColumns[2],
    baseColumns[3],

    {
      title: "Primary",
      render: (_: any, row: IpRow) => {
        if (row.tunnels.length === 0) {
          return (
            <select
              style={{
                width: "100%",
                padding: 6,
                background: "#ffd6d6",
                fontWeight: 700,
              }}
            >
              <option>NA</option>
            </select>
          );
        }

        const colorCounts: Record<string, number> = {};

        row.tunnels.forEach((t: any) => {
          colorCounts[t.localColor] =
            (colorCounts[t.localColor] || 0) + 1;
        });

        const primaryColor = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])[0][0];

        const primaryList = sortTunnels(
          row.tunnels.filter((t: any) => t.localColor === primaryColor)
        );

        const selected = primaryList[0];

        return (
          <select
            style={{
              width: "100%",
              padding: 6,
              background: getBgForTunnel(selected),
              fontWeight: 700,
            }}
          >
            {primaryList.map((t: any, i: number) => (
              <option key={i} style={{ background: getBgForTunnel(t) }}>
                {resolveIspName(t.tunnelName)} — {t.uptime}
              </option>
            ))}
          </select>
        );
      },
    },

    {
      title: "Secondary",
      render: (_: any, row: IpRow) => {
        if (row.tunnels.length === 0) {
          return (
            <select
              style={{
                width: "100%",
                padding: 6,
                background: "#ffd6d6", // ✅ WHITE BOX
                fontWeight: 700,
              }}
            >
              <option></option>
            </select>
          );
        }

        const colorCounts: Record<string, number> = {};

        row.tunnels.forEach((t: any) => {
          colorCounts[t.localColor] =
            (colorCounts[t.localColor] || 0) + 1;
        });

        const primaryColor = Object.entries(colorCounts)
          .sort((a, b) => b[1] - a[1])[0][0];

        const secondaryList = sortTunnels(
          row.tunnels.filter((t: any) => t.localColor !== primaryColor)
        );

        if (secondaryList.length === 0) {
          return (
            <select
              style={{
                width: "100%",
                padding: 6,
                background: "#ffffff", // ✅ WHITE BOX
                fontWeight: 700,
              }}
            >
              <option></option>
            </select>
          );
        }

        const selected = secondaryList[0];

        return (
          <select
            style={{
              width: "100%",
              padding: 6,
              background: getBgForTunnel(selected),
              fontWeight: 700,
            }}
          >
            {secondaryList.map((t: any, i: number) => (
              <option key={i} style={{ background: getBgForTunnel(t) }}>
                {resolveIspName(t.tunnelName)} — {t.uptime}
              </option>
            ))}
          </select>
        );
      },
    },

    baseColumns[4],
  ];

  return (
    <>
      {contextHolder}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
          fontWeight: 600,
        }}
      >
        <h2>SD-WAN Tunnels Status</h2>
        <h5>
          Updated on : {time.hh}:{time.mm}:{time.ss}
        </h5>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Row gutter={[16, 16]} align="stretch" style={{ width: "100%" }}>
          <Col xs={24} md={8} style={{ display: "flex" }}>
            <div style={{ width: "100%" }}>
              <Vmanage />
            </div>
          </Col>

          <Col xs={24} md={8} style={{ display: "flex" }}>
            <div style={{ width: "100%" }}>
              <Certificate />
            </div>
          </Col>

          <Col xs={24} md={8} style={{ display: "flex" }}>
            <div style={{ width: "100%" }}>
              <ProblemsSummaryTable />
            </div>
          </Col>
        </Row>
      </div>


      {table2Rows.length > 0 && (
        <Card title="SD-WAN Tunnels — Other IPs">
          <Table
            loading={loading}
            columns={table2Columns}
            dataSource={table2Rows}
            bordered
            pagination={false}
            rowKey={(r) => r.systemIp}
            size={mode === "widget" ? "small" : "middle"}
          />
        </Card>
      )}
      <Card title="SD-WAN Tunnels — Primary 4 IPs" style={{ marginBottom: 20 }}>
        <Table
          loading={loading}
          columns={baseColumns}
          dataSource={table1Rows}
          bordered
          pagination={false}
          rowKey={(r) => r.systemIp}
          size={mode === "widget" ? "small" : "middle"}
        />
      </Card>
    </>
  );
}
