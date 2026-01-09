"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Table, Button, Modal } from "antd";
import branches from "../data/data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

interface Props {
  mode?: "page" | "widget";
}

export default function TunnelsTable({ mode = "page" }: Props) {
  const [rows, setRows] = useState<IpRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  async function load() {
    try {
      const cached = localStorage.getItem("preloaded_tunnels");

      if (cached) {
        setRows(JSON.parse(cached));
        localStorage.removeItem("preloaded_tunnels");
        return;
      }

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

  function downloadPdf() {
    const doc = new jsPDF();
    doc.text("SD-WAN Tunnel Report", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Branch", "Hostname", "System IP", "Tunnels"]],
      body: rows.map((r) => [
        r.branchName,
        r.hostname,
        r.systemIp,
        r.tunnels.length,
      ]),
    });

    doc.save("sdwan_report.pdf");
  }

  const columns: any = [
    {
      title: "Branch",
      dataIndex: "branchName",
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
    { title: "Hostname", dataIndex: "hostname" },
    { title: "System IP", dataIndex: "systemIp" },
    {
      title: "Tunnels",
      render: (_: any, row: IpRow) => row.tunnels.length,
    },
    {
      title: "State",
      render: (_: any, row: IpRow) => row.rowState,
    },
  ];

  return (
    <div>
      {mode === "page" && (
        <div className="flex justify-between mb-4">
          <h1 className="text-xl font-bold">
            SD-WAN — Tunnel Status by IP
          </h1>
          <Button type="primary" onClick={() => setShowPreview(true)}>
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
            columns={columns}
            dataSource={rows}
            pagination={false}
            rowKey={(r) => r.systemIp}
          />
        </Modal>
      )}
    </div>
  );
}
