"use client";

import { useEffect, useState } from "react";
import { Table, Button, Modal, Card, Select } from "antd";
import branches from "../data/data";
import { ISP_BRANCHES } from "../data/data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ===================== TYPES ===================== */

type Tunnel = {
  tunnelName: string;
  localSystemIp: string;
  remoteSystemIp: string;
  localColor: string;
  remoteColor: string;
  state: "up" | "down" | "partial";
  uptime: string;
  hostname: string;

  // ✅ used in primary/secondary logic
  downtimeSec?: number;
};

type IpRow = {
  hostname: string;
  systemIp: string;
  branchName: string;
  tunnels: Tunnel[];
  rowState: "up" | "down" | "partial";

  // ✅ ADD THESE (same as dashboard)
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

/* ✅ GET ONLY ISP_BRANCH NAME */
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

function getBgForTunnel(tunnel: any) {
  if (!tunnel) return "#ffd6d6";
  if (tunnel.state === "down") return "#ffd6d6";
  if (tunnel.state === "up") return "#d7ffd7";
  return "#ffe5b4";
}

const sortTunnels = (list: any[]) =>
  [...list].sort((a, b) => {
    if (a.state === "down" && b.state !== "down") return -1;
    if (a.state !== "down" && b.state === "down") return 1;
    return 0;
  });

/* ===================== JSON → TABLE TRANSFORM ===================== */

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
      tunnels: tunnels as Tunnel[],
      rowState,

      // ✅ ADDED same fields (for primary/secondary NA DOWN)
      siteState: site?.siteState,
      downtimeSec: site?.downtimeSec,
    });
  });

  const order = { down: 0, partial: 1, up: 2 };
  rows.sort((a, b) => order[a.rowState] - order[b.rowState]);

  return rows;
}

/* ===================== COMPONENT ===================== */

interface Props {
  mode?: "page" | "widget";
}

export default function TunnelsTable({ mode = "page" }: Props) {
  const [rows, setRows] = useState<IpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // 👉 SINGLE WIDTH SOURCE (MATCHES TUNNEL DROPDOWN)
  const TUNNEL_DROPDOWN_WIDTH = 500;

  const formatDowntime = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "NA";

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
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

    return formatDowntime(maxDowntime);
  };

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/sdwan/tunnels");
      const json = await res.json();
      const data = transformJsonToRows(json);
      setRows(data);
    } catch (e) {
      console.error("JSON LOAD ERROR:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleExport() {
    setShowPreview(true);
  }

  function downloadPdf() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("SD-WAN Tunnel Report", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Branch Name", "Hostname", "System IP", "Tunnels"]],
      body: rows.map((r) => [
        getBranchNameByHostname(r.hostname),
        r.hostname,
        r.systemIp,
        r.tunnels.length,
      ]),
    });

    doc.save("sdwan_report.pdf");
  }

  /* ===================== BASE COLUMNS ===================== */
  const baseColumns: any = [
    {
      title: "Branch",
      width: 130,
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
      width: 150,

      ellipsis: true,
      render: (text: string) => <span style={{ fontWeight: 700 }}>{text}</span>,
    },
    {
      title: "System IP",
      dataIndex: "systemIp",
      width: 135,
      render: (text: string) => <span style={{ fontWeight: 700 }}>{text}</span>,
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
      width: 90,
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

  /* ===================== PRIMARY / SECONDARY (COPIED FROM DASHBOARD STYLE) ===================== */

  const primaryColumn: any = {
    title: "Primary",
    width: TUNNEL_DROPDOWN_WIDTH,
    ellipsis: true,

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
        colorCounts[t.localColor] = (colorCounts[t.localColor] || 0) + 1;
      });

      const primaryColor = Object.entries(colorCounts).sort(
        (a, b) => b[1] - a[1]
      )[0][0];

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
    ellipsis: true,

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
        colorCounts[t.localColor] = (colorCounts[t.localColor] || 0) + 1;
      });

      const primaryColor = Object.entries(colorCounts).sort(
        (a, b) => b[1] - a[1]
      )[0][0];

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

  /* ============ SPLIT INTO TWO TABLES ============ */
  const FIXED_FIRST_TABLE_IPS = [
    "192.168.222.1",
    "192.168.222.2",
    "192.168.222.3",
    "192.168.222.4",
  ];

  const table1Rows = rows.filter((r) =>
    FIXED_FIRST_TABLE_IPS.includes(r.systemIp)
  );

  const table2Rows = rows.filter((r) => !FIXED_FIRST_TABLE_IPS.includes(r.systemIp));

  const table1Columns = baseColumns;

  const table2Columns = [
    ...baseColumns.filter(
      (col: any) =>
        col.title !== "Tunnels (Name + Uptime)" && col.title !== "State"
    ),
    primaryColumn,
    secondaryColumn,
    baseColumns.find((col: any) => col.title === "State"),
  ];

  return (
    <div>
      {mode === "page" && (
        <div
          className="mb-4"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 className="text-xl font-bold">SD-WAN — Tunnel Status by IP</h1>
          <Button type="primary" onClick={handleExport}>
            Export / Preview
          </Button>
        </div>
      )}

      <Card title="SD-WAN IPsec Tunnels" style={{ marginBottom: "2%" }}>
        <Table
          loading={loading}
          columns={table1Columns}
          dataSource={table1Rows}
          bordered
          pagination={false}
          rowKey={(r) => r.systemIp}
          size={mode === "widget" ? "small" : "middle"}
        />
      </Card>

      {table2Rows.length > 0 && (
        <Card title="SD-WAN IPsec Tunnels" style={{ marginBottom: 20 }}>
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

      {mode === "page" && (
        <Modal
          open={showPreview}
          title="Export Preview"
          onCancel={() => setShowPreview(false)}
          width={900}
          footer={[
            <Button key="close" onClick={() => setShowPreview(false)}>
              Close
            </Button>,
            <Button key="pdf" type="primary" onClick={downloadPdf}>
              Download PDF
            </Button>,
          ]}
        >
          <Table
            columns={[
              {
                title: "Branch",
                render: (_: any, r: any) => getBranchNameByHostname(r.hostname),
              },
              { title: "Hostname", dataIndex: "hostname" },
              { title: "System IP", dataIndex: "systemIp" },
              {
                title: "Tunnels",
                render: (_: any, row: any) => row.tunnels.length,
              },
            ]}
            dataSource={rows}
            bordered
            pagination={false}
            rowKey={(r: any) => r.systemIp}
          />
        </Modal>
      )}
    </div>
  );
}
