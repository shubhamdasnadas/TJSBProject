"use client";

import { useEffect, useState } from "react";
import { Table, Button, Modal } from "antd";
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
  state: "up" | "down";
  uptime: string;
  hostname: string;
};

type IpRow = {
  hostname: string;
  systemIp: string;
  branchName: string;
  tunnels: Tunnel[];
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

/* ===================== JSON → TABLE TRANSFORM ===================== */

function transformJsonToRows(json: any): IpRow[] {
  const devices = json?.devices ?? {};
  const rows: IpRow[] = [];

  Object.entries(devices).forEach(([systemIp, tunnels]: any) => {
    if (!Array.isArray(tunnels) || tunnels.length === 0) return;

    const hostname = tunnels[0]?.hostname ?? "Unknown";

    const up = tunnels.filter((t: any) => t.state === "up").length;
    const down = tunnels.filter((t: any) => t.state === "down").length;

    let rowState: "up" | "down" | "partial" = "partial";
    if (up === tunnels.length) rowState = "up";
    else if (down === tunnels.length) rowState = "down";

    rows.push({
      hostname,
      systemIp,
      branchName: getBranchNameByHostname(hostname),
      tunnels,
      rowState,
    });
  });

  // ✅ Required sorting: down → partial → up
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

  async function load() {
    setLoading(true);
    try {
      // ✅ LOAD FROM /public
      const res = await fetch("/sdwan_tunnels.json");
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

  /* ===================== TABLE (UNCHANGED) ===================== */

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
          {row.tunnels.map((t, i) => (
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
    <div>
      {mode === "page" && (
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">
            SD-WAN — Tunnel Status by IP
          </h1>
          <Button type="primary" onClick={handleExport}>
            Export / Preview
          </Button>
        </div>
      )}

      <Table
        loading={loading}
        columns={columns}
        dataSource={rows}
        bordered
        pagination={false}
        rowKey={(r) => r.systemIp}
        size={mode === "widget" ? "small" : "middle"}
      />

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
                render: (_: any, r: any) =>
                  getBranchNameByHostname(r.hostname),
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
