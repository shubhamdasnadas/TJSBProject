"use client";

import { useEffect, useState } from "react";
import { Table, Button, Modal } from "antd";
import branches from "../(DashboardLayout)/availability/data/data";
import { ISP_BRANCHES } from "../(DashboardLayout)/availability/data/data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadTunnels } from "@/utils/loadTunnels";

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
      result = result.replace(
        new RegExp(type, "gi"),
        isp.name
      );
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
  const [showPreview, setShowPreview] = useState(false);

  async function load() {
    setLoading(true);

    try {
      const cached = localStorage.getItem("preloaded_tunnels");
      if (!cached) {
        setRows([]);
        return;
      }

      const data: IpRow[] = JSON.parse(cached);

      const order = { down: 0, partial: 1, up: 2 };
      data.sort((a, b) => order[a.rowState] - order[b.rowState]);

      setRows(data);
    } catch (e) {
      console.error("FRONTEND ERROR:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

//   useEffect(() => {
//     const timeoutId = setTimeout(async () => {
//       const res = await loadTunnels();
//       localStorage.setItem(
//         "preloaded_tunnels",
//         JSON.stringify(res)
//       );
//     }, 180000);

//     return () => clearTimeout(timeoutId);
//   }, []);




  function handleExport() {
    setShowPreview(true);
  }

//   function downloadPdf() {
//     const doc = new jsPDF();
//     doc.setFontSize(14);
//     doc.text("SD-WAN Tunnel Report", 14, 16);

//     autoTable(doc, {
//       startY: 22,
//       head: [["Branch Name", "Hostname", "System IP", "Tunnels"]],
//       body: rows.map((r: any) => [
//         getBranchNameByHostname(r.hostname),
//         r.hostname,
//         r.systemIp,
//         r.tunnels.length,
//       ]),
//     });

//     doc.save("sdwan_report.pdf");
//   }

  const columns: any = [
    {
      title: "Branch",
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
              {resolveIspName(t.tunnelName)} — {t.uptime}
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
    
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">
            SD-WAN — Tunnel Status by IP
          </h1>
{/* 
          <Button type="primary" onClick={handleExport}>
            Export / Preview
          </Button> */}
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

      {/* {mode === "page" && (
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
      )} */}
    </div>
  );
}
