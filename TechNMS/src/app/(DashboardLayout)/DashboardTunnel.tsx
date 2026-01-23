"use client";

import { useEffect, useRef, useState } from "react";
import { Col, Row, Table, notification, Card, Select } from "antd";
import branches from "../(DashboardLayout)/availability/data/data";
import { ISP_BRANCHES } from "../(DashboardLayout)/availability/data/data";
import Certificate from "./widget/cardDashboard/certificate/page";
import Vmanage from "./widget/cardDashboard/vmanage/page";
import ProblemsSummaryTable from "./widget/cardDashboard/problemsummarycount";
import Host1Count from "./widget/cardDashboard/host1Count/page";

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

  // ✅ ADD THESE
  siteState?: "UP" | "DOWN";
  downtimeSec?: number;
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

function getIspNameOnly(
  tunnel: any,
  suffix?: string // ✅ downtime / uptime text
) {
  let ispName = "";

  ISP_BRANCHES.forEach((isp) => {
    const type = isp.type.toLowerCase();
    if (tunnel?.tunnelName?.toLowerCase().includes(type)) {
      ispName = isp.name;
    }
  });

  const finalName = ispName || resolveIspName(tunnel.tunnelName);

  // ✅ append only if suffix is provided
  return suffix ? `${finalName} — ${suffix}` : finalName;
}


/* ===================== JSON → TABLE ===================== */
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
      siteState: site?.siteState,
      downtimeSec: site?.downtimeSec,
    });
  });

  const priority = { down: 0, partial: 1, up: 2 };
  rows.sort((a, b) => priority[a.rowState] - priority[b.rowState]);

  return rows;
}

/* ===================== BACKGROUND COLOR ===================== */
function getBgForTunnel(tunnel: any) {
  if (!tunnel) return "#ffd6d6";
  if (tunnel.state === "down") return "#ffd6d6";
  if (tunnel.state === "up") return "#d7ffd7";
  return "#ffe5b4";
}

/* ===================== SORT HELPER ===================== */
const sortTunnels = (list: any[]) =>
  [...list].sort((a, b) => {
    if (a.state === "down" && b.state !== "down") return -1;
    if (a.state !== "down" && b.state === "down") return 1;
    return 0;
  });

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

    // playSound();

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

  const getPartialDowntime = (current: any, list: any[]) => {
    if (!current || !Array.isArray(list)) return "NA";

    // Get ISP name of current tunnel
    const currentIsp = resolveIspName(current.tunnelName);

    // Filter tunnels of same ISP that are DOWN
    const sameIspDownTunnels = list.filter(
      (t) =>
        resolveIspName(t.tunnelName) === currentIsp &&
        t.state === "down" &&
        typeof t.downtimeSec === "number"
    );

    if (!sameIspDownTunnels.length) return "NA";

    // Find maximum downtime
    const maxDowntime = Math.max(
      ...sameIspDownTunnels.map((t) => t.downtimeSec)
    );

    // Format using your existing helper
    return formatDowntime(maxDowntime);
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

  const TUNNEL_DROPDOWN_WIDTH = 200;

  const formatDowntime = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "NA";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  async function load() {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch("/api/sdwan/tunnels");
      const json = await res.json();
      console.log("json", json.generatedAt)
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
      width: 90,
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
    {
      title: "Hostname",
      dataIndex: "hostname",
      width: 85,

      ellipsis: true,   // prevents overflow
      render: (text: string) => (
        <span style={{ fontWeight: 700 }}>
          {text}
        </span>
      ),
    },
    {
      title: "System IP",
      dataIndex: "systemIp",
      width: 65,
      render: (text: string) => (
        <span style={{ fontWeight: 700 }}>{text}</span>
      ),
    },
    {
      title: "Tunnels (Name + Uptime)",
      width: TUNNEL_DROPDOWN_WIDTH,
      ellipsis: true,
      render: (_: any, row: IpRow) => {
        const sortedTunnels =
          row.tunnels.length > 0 ? sortTunnels(row.tunnels) : [];

        const selectedTunnel = sortedTunnels[0];
        const bg =
          row.tunnels.length === 0 || selectedTunnel?.state === "down"
            ? "#ffd6d6"
            : "#d7ffd7";

        if (row.tunnels.length === 0) {
          return (
            <Select
              style={{
                width: "100%",
                backgroundColor: "#ffd6d6",
                border: "1px solid #000",
                fontWeight: 700,
              }}
              value="NA"
            >
              <Select.Option value="NA">NA</Select.Option>
            </Select>
          );
        }

        return (
          <Select
            style={{
              width: "100%",
              backgroundColor: bg,
              border: "1px solid #000",
              fontWeight: 700,
            }}
            value={sortedTunnels[0].tunnelName}
          >
            {sortedTunnels.map((t: any, i: number) => (
              <Select.Option
                key={i}
                value={t.tunnelName}
                style={{ backgroundColor: getBgForTunnel(t) }}
              >
                {resolveIspName(t.tunnelName)} — {t.uptime}
              </Select.Option>
            ))}
          </Select>
        );
      },
    },
    {
      title: "State",
      width: 45,
      ellipsis: true,
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

  const primaryColumn: any = {
    title: "Primary",
    width: TUNNEL_DROPDOWN_WIDTH,
    ellipsis: true, // ✅ ENABLED

    render: (_: any, row: IpRow) => {
      if (row.tunnels.length === 0) {
        const isDown = row.siteState === "DOWN";
        const downtimeText = isDown
          ? `DOWN — ${formatDowntime(row.downtimeSec)}`
          : "NA";

        return (
          <Select
            style={{
              width: "100%",
              backgroundColor: "#ffd6d6",
              border: "1px solid #000",
              fontWeight: 700,
            }}
            value={downtimeText}
          >
            <Select.Option value={downtimeText}>
              <span
                title={downtimeText}
                style={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {downtimeText}
              </span>
            </Select.Option>
          </Select>
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

      const first = primaryList[0];
      const firstStatusText =
        first.state === "down"
          ? formatDowntime(first.downtimeSec)
          : first.state === "partial"
            ? getPartialDowntime(first, primaryList)
            : first.uptime;
      return (
        <Select
          style={{
            width: "100%",
            backgroundColor: getBgForTunnel(first),
            border: "1px solid #000",
            fontWeight: 700,
          }}
          value={getIspNameOnly(first, firstStatusText)}
          optionLabelProp="label"
        >
          {primaryList.map((t: any, i: number) => {
            const statusText =
              t.state === "down"
                ? formatDowntime(t.downtimeSec)
                : t.state === "partial"
                  ? getPartialDowntime(t, primaryList)
                  : t.uptime;

            const text = `${resolveIspName(t.tunnelName)} — ${statusText}`;

            return (
              <Select.Option
                key={i}
                value={t.tunnelName}
                label={text}
                style={{
                  backgroundColor: getBgForTunnel(t),
                }}
              >
                <span
                  title={text}
                  style={{
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {text}
                </span>
              </Select.Option>
            );
          })}
        </Select>
      );
    },
  };
  const secondaryColumn: any = {
    title: "Secondary",
    width: TUNNEL_DROPDOWN_WIDTH,
    ellipsis: true, // ✅ SAME AS PRIMARY

    render: (_: any, row: IpRow) => {
      if (row.tunnels.length === 0) {
        const isDown = row.siteState === "DOWN";
        const downtimeText = isDown
          ? `DOWN — ${formatDowntime(row.downtimeSec)}`
          : "NA";

        return (
          <Select
            style={{
              width: "100%",
              backgroundColor: "#ffd6d6",
              border: "1px solid #000",
              fontWeight: 700,
            }}
            value={downtimeText}
          >
            <Select.Option value={downtimeText}>
              <span
                title={downtimeText}
                style={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {downtimeText}
              </span>
            </Select.Option>
          </Select>
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
          <Select
            style={{
              width: "100%",
              backgroundColor: "#ffffff",
              border: "1px solid #000",
              fontWeight: 700,
            }}
          />
        );
      }

      const first = secondaryList[0];
      const firstStatusText =
        first.state === "down"
          ? formatDowntime(first.downtimeSec)
          : first.state === "partial"
            ? getPartialDowntime(first, secondaryList)
            : first.uptime;
      return (
        <Select
          style={{
            width: "100%",
            backgroundColor: getBgForTunnel(first),
            border: "1px solid #000",
            fontWeight: 700,
          }}
          value={getIspNameOnly(first, firstStatusText)}
          optionLabelProp="label"
        >
          {secondaryList.map((t: any, i: number) => {
            const statusText =
              t.state === "down"
                ? formatDowntime(t.downtimeSec)
                : t.state === "partial"
                  ? getPartialDowntime(t, secondaryList)
                  : t.uptime;

            const text = `${resolveIspName(t.tunnelName)} — ${statusText}`;

            return (
              <Select.Option
                key={i}
                value={t.tunnelName}
                label={text}
                style={{
                  backgroundColor: getBgForTunnel(t),
                }}
              >
                <span
                  title={text}
                  style={{
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {text}
                </span>
              </Select.Option>
            );
          })}
        </Select>
      );
    },
  };
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
  const table2Columns = [
    // First three base columns (Branch, Hostname, System IP)
    ...baseColumns.filter(
      (col: any) =>
        col.title !== "Tunnels (Name + Uptime)" &&
        col.title !== "State"
    ),

    // Then Primary & Secondary
    primaryColumn,
    secondaryColumn,

    // Finally add State at the very last position
    baseColumns.find((col: any) => col.title === "State"),
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
        <h2>SD-WAN IPsec Tunnels Status</h2>
        <h5>
          Updated on : {time.hh}:{time.mm}:{time.ss}
        </h5>
      </div>

      <div style={{ marginBottom: 20, width: "100%" }}>
        <Row
          gutter={[20, 20]}
          align="stretch"
          style={{ margin: 0, width: "100%" }}
        >
          <Col xs={24} md={6} style={{ display: "flex" }}>
            <div style={{ width: "100%" }}>
              <Vmanage />
            </div>
          </Col>

          <Col xs={24} md={6} style={{ display: "flex" }}>
            <div style={{ width: "100%" }}>
              <Certificate />
            </div>
          </Col>

          <Col xs={24} md={6} style={{ display: "flex" }}>
            <div style={{ width: "100%" }}>
              <ProblemsSummaryTable />
            </div>
          </Col>

          <Col xs={24} md={6} style={{ display: "flex" }}>
            <div style={{ width: "100%" }}>
              <Host1Count />
            </div>
          </Col>
        </Row>
      </div>

      {table2Rows.length > 0 && (
        <Card>
          <h2>SD-WAN IPsec Tunnels Status - Branches</h2>
          <Table
            loading={loading}
            columns={table2Columns}
            dataSource={table2Rows}
            bordered
            pagination={false}
            rowKey={(r) => r.systemIp}
            size={mode === "widget" ? "small" : "middle"}
            showHeader={true}   // ✅ HEADER REMOVED (ONLY CHANGE)
          />
        </Card>
      )}

      <Card style={{ marginBottom: 20 }}>
        <h2>SD-WAN IPsec Tunnels Status - Data Center</h2>
        <Table
          loading={loading}
          columns={baseColumns}
          dataSource={table1Rows}
          bordered
          pagination={false}
          rowKey={(r) => r.systemIp}
          size={mode === "widget" ? "small" : "middle"}
          showHeader={true}   // ✅ HEADER REMOVED (ONLY CHANGE)
        />
      </Card>
    </>
  );
}
