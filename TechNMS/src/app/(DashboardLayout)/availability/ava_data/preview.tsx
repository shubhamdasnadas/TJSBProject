"use client";

import { useEffect, useState } from "react";
import { Table, Button } from "antd";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ExportPreview() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("exportData");
    if (!raw) return;

    const parsed = JSON.parse(raw);

    const devices = parsed.devices || {};

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
  }, []);

  function downloadPdf() {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text("SD-WAN Tunnel Report", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Branch", "Hostname", "System IP", "Total Tunnels"]],
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Export Preview</h2>

        <Button type="primary" onClick={downloadPdf}>
          Download PDF
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={rows}
        bordered
        pagination={false}
        rowKey={(r) => r.systemIp}
      />
    </div>
  );
}
