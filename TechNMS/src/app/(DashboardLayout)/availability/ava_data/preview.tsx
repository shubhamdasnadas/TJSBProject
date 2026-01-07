"use client";

import { useEffect, useState } from "react";
import { Table, Button } from "antd";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Preview() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await axios.post("/api/sdwan/tunnels");

      const devices = res.data.devices || {};

      const formatted = Object.entries(devices).map(
        ([systemIp, tunnels]: any) => {
          const first = tunnels[0];

          return {
            hostname: first?.hostname || "NA",
            systemIp,
            branchName: first?.branchName || "Unknown",
            tunnels,
          };
        }
      );

      setRows(formatted);
    } catch (e) {
      console.error("PREVIEW ERROR:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function downloadPdf() {
    const doc = new jsPDF();

    doc.setFontSize(14);
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
    { title: "Branch", dataIndex: "branchName" },
    { title: "Hostname", dataIndex: "hostname" },
    { title: "System IP", dataIndex: "systemIp" },
    {
      title: "Tunnels",
      render: (_: any, row: any) => row.tunnels.length,
    },
  ];

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-bold">Export Preview</h2>

        <Button type="primary" onClick={downloadPdf}>
          Download PDF
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
