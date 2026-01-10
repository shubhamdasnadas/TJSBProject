"use client";

import React, { useEffect, useState } from "react";
import { Card, Select, Button, Row, Col, Tag, Table } from "antd";
import axios from "axios";

/* =========================
   Types
========================= */
interface EventRow {
  key: string;
  time: string;
  recovery_time?: string;
  hostname: string;
  problem: string;
  severity: string;
  status: string;
}

/* =========================
   Component
========================= */
export default function EventsPage() {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : "";

  const [groups, setGroups] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [groupids, setGroupids] = useState<string[]>([]);
  const [hostids, setHostids] = useState<string[]>([]);
  const [data, setData] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* Pagination */
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* =========================
     Keyboard pagination
  ========================= */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const totalPages = Math.ceil(data.length / pageSize);
      if (e.altKey && e.key.toLowerCase() === "n")
        setCurrentPage((p) => Math.min(p + 1, totalPages));
      if (e.altKey && e.key.toLowerCase() === "p")
        setCurrentPage((p) => Math.max(p - 1, 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data.length, pageSize]);

  /* =========================
     Load groups
  ========================= */
  useEffect(() => {
    axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "hostgroup.get",
        params: { output: ["groupid", "name"] },
        id: 1,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => setGroups(r.data.result ?? []));
  }, []);

  /* =========================
     Load hosts
  ========================= */
  useEffect(() => {
    if (!groupids.length) {
      setHosts([]);
      return;
    }

    axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "name"],
          groupids,
        },
        id: 2,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    ).then(r => setHosts(r.data.result ?? []));
  }, [groupids]);

  /* =========================
     Apply filters (event.get)
  ========================= */
  const applyFilters = async () => {
    setLoading(true);

    try {
      const now = Math.floor(Date.now() / 1000);

const r = await axios.post(
  "/api/zabbix-proxy",
  {
    jsonrpc: "2.0",
    method: "event.get",
    params: {
      output: [
        "eventid",
        "clock",
        "name",
        "severity",
        "value",
        "r_eventid"
      ],
      selectHosts: ["name"],
      source: 0,
      object: 0,
      groupids,
      hostids,
      time_from: now - 24 * 3600,
      sortfield: ["clock"],
      sortorder: "DESC",
      limit: 1000
    },
    id: 3
  },
  { headers: { Authorization: `Bearer ${token}` } }
);

      const rows: EventRow[] = (r.data.result ?? []).map((e: any) => ({
        key: e.eventid,
        time: new Date(e.clock * 1000).toLocaleString(),
        recovery_time: e.r_clock
          ? new Date(e.r_clock * 1000).toLocaleString()
          : undefined,
        hostname: e.hosts?.[0]?.name ?? "Unknown",
        problem: e.name,
        severity: e.severity,
        status: e.value === "0" ? "RESOLVED" : "PROBLEM",
      }));

      setData(rows);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     Helpers
  ========================= */
  const severityTag = (s: string) => {
    const colors = ["#aaa", "#1890ff", "#fa8c16", "#faad14", "#f5222d", "#722ed1"];
    return <Tag color={colors[Number(s)]}>{s}</Tag>;
  };

  /* =========================
     Columns
  ========================= */
  const columns = [
    { title: "Time", dataIndex: "time", width: 170 },
    {
      title: "Severity",
      dataIndex: "severity",
      width: 100,
      render: (s: string) => severityTag(s),
    },
    {
      title: "Recovery time",
      dataIndex: "recovery_time",
      width: 170,
      render: (v: string) => v || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (s: string) =>
        s === "RESOLVED" ? (
          <Tag color="green">RESOLVED</Tag>
        ) : (
          <Tag color="red">PROBLEM</Tag>
        ),
    },
    { title: "Host", dataIndex: "hostname", width: 200 },
    { title: "Problem", dataIndex: "problem" },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card title="Events (event.get)">
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              mode="multiple"
              placeholder="Host Groups"
              style={{ width: "100%" }}
              options={groups.map(g => ({ value: g.groupid, label: g.name }))}
              onChange={setGroupids}
            />
          </Col>

          <Col span={6}>
            <Select
              mode="multiple"
              placeholder="Hosts"
              style={{ width: "100%" }}
              options={hosts.map(h => ({ value: h.hostid, label: h.name }))}
              onChange={setHostids}
            />
          </Col>

          <Col span={4}>
            <Button type="primary" onClick={applyFilters}>
              Apply
            </Button>
          </Col>
        </Row>

        <Table
          rowKey="key"
          columns={columns}
          dataSource={data}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total: data.length,
            showSizeChanger: true,
            onChange: (p, s) => {
              setCurrentPage(p);
              setPageSize(s);
            },
          }}
        />
      </Card>
    </div>
  );
}




// "use client";

// import React, { useEffect, useState } from "react";
// import {
//   Card,
//   Input,
//   Select,
//   Button,
//   Space,
//   Row,
//   Col,
//   Divider,
//   Tag,
//   Table,
//   Radio,
//   Checkbox,
//   Modal,
//   Tooltip,
// } from "antd";
// import axios from "axios";

// /* =========================
//    Types
// ========================= */
// interface LatestInterface {
//   ip: string;
//   dns: string;
//   port: string;
//   type: string;
// }

// interface TriggerItem {
//   key: string;
//   triggerid: string;
//   timestamp: string;
//   time_from?: number;
//   time_till?: number;
//   hostname: string;
//   hostid?: string;
//   description: string;
//   comments?: string;
//   priority: string;
//   status: string;
//   depends_on?: string;
//   tags?: Array<{ tag: string; value: string }>;
//   recovery_time?: string;
//   acknowledgement?: string;
// }

// const HostFilterCard = () => {
//   const user_token =
//     typeof window !== "undefined"
//       ? localStorage.getItem("zabbix_auth")
//       : null;

//   const [hostGroups, setHostGroups] = useState<any[]>([]);
//   const [hosts, setHosts] = useState<any[]>([]);
//   const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
//   const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
//   const [tableData, setTableData] = useState<TriggerItem[]>([]);
//   const [loadingTable, setLoadingTable] = useState(false);

//   /* ✅ Pagination */
//   const [currentPage, setCurrentPage] = useState(1);
//   const [pageSize, setPageSize] = useState(10);

//   /* =========================
//      Keyboard Pagination
//      Alt + N / Alt + P
//   ========================= */
//   useEffect(() => {
//     const handleKeyDown = (e: KeyboardEvent) => {
//       // ⛔ Ignore typing
//       if (
//         e.target instanceof HTMLInputElement ||
//         e.target instanceof HTMLTextAreaElement
//       )
//         return;

//       const totalPages = Math.ceil(tableData.length / pageSize);

//       if (e.altKey && e.key.toLowerCase() === "n") {
//         e.preventDefault();
//         setCurrentPage((p) => (p < totalPages ? p + 1 : p));
//       }

//       if (e.altKey && e.key.toLowerCase() === "p") {
//         e.preventDefault();
//         setCurrentPage((p) => (p > 1 ? p - 1 : p));
//       }
//     };

//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [tableData.length, pageSize]);

//   /* =========================
//      Load Host Groups
//   ========================= */
//   useEffect(() => {
//     axios
//       .post(
//         "/api/zabbix-proxy",
//         {
//           jsonrpc: "2.0",
//           method: "hostgroup.get",
//           params: { output: ["groupid", "name"] },
//           id: 1,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${user_token}`,
//           },
//         }
//       )
//       .then((r) => setHostGroups(r.data.result ?? []));
//   }, []);

//   /* =========================
//      Load Hosts
//   ========================= */
//   useEffect(() => {
//     if (!selectedGroups.length) {
//       setHosts([]);
//       return;
//     }

//     axios
//       .post(
//         "/api/zabbix-proxy",
//         {
//           jsonrpc: "2.0",
//           method: "host.get",
//           params: {
//             output: ["hostid", "name"],
//             groupids: selectedGroups,
//           },
//           id: 2,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${user_token}`,
//           },
//         }
//       )
//       .then((r) => setHosts(r.data.result ?? []));
//   }, [selectedGroups]);

//   /* =========================
//      Apply Filters
//   ========================= */
//   const handleApplyFilters = async () => {
//     setLoadingTable(true);
//     try {
//       const r = await axios.post(
//         "/api/zabbix-proxy",
//         {
//           jsonrpc: "2.0",
//           method: "problem.get",
//           params: {
//             output: ["eventid", "objectid", "clock", "name", "severity"],
//             groupids: selectedGroups,
//             hostids: selectedHosts,
//             recent: true,
//             sortfield: ["eventid"],
//             sortorder: "DESC",
//           },
//           id: 3,
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${user_token}`,
//           },
//         }
//       );

//       const problems = r.data.result ?? [];

//       const formatted = problems.map((p: any) => ({
//         key: p.eventid,
//         triggerid: p.objectid,
//         timestamp: new Date(p.clock * 1000).toLocaleString(),
//         time_from: p.clock,
//         hostname: p.hosts?.[0]?.name ?? "Unknown",
//         description: p.name,
//         priority: p.severity,
//         status: "0",
//       }));

//       setTableData(formatted);
//       setCurrentPage(1);
//     } finally {
//       setLoadingTable(false);
//     }
//   };

//   /* =========================
//      Helpers
//   ========================= */
//   const getSeverityTag = (priority: string) => {
//     const p = Number(priority);
//     const colors = ["#aaa", "#1890ff", "#fa8c16", "#faad14", "#f5222d", "#722ed1"];
//     return <Tag color={colors[p] || "#aaa"}>{priority}</Tag>;
//   };

//   const columns = [
//     { title: "Time", dataIndex: "timestamp", width: 160 },
//     {
//       title: "Severity",
//       dataIndex: "priority",
//       width: 100,
//       render: (p: string) => getSeverityTag(p),
//     },
//     { title: "Host", dataIndex: "hostname", width: 180 },
//     { title: "Problem", dataIndex: "description" },
//   ];

//   return (
//     <div style={{ padding: 24 }}>
//       <Card
//         title={
//           <span>
//             Problems
//             <span style={{ marginLeft: 12, color: "#999", fontSize: 12 }}>
//               (Alt + N / Alt + P)
//             </span>
//           </span>
//         }
//       >
//         <Row gutter={16} style={{ marginBottom: 16 }}>
//           <Col span={6}>
//             <Select
//               mode="multiple"
//               placeholder="Host Groups"
//               style={{ width: "100%" }}
//               options={hostGroups.map((g) => ({
//                 value: g.groupid,
//                 label: g.name,
//               }))}
//               onChange={setSelectedGroups}
//             />
//           </Col>

//           <Col span={6}>
//             <Select
//               mode="multiple"
//               placeholder="Hosts"
//               style={{ width: "100%" }}
//               options={hosts.map((h) => ({
//                 value: h.hostid,
//                 label: h.name,
//               }))}
//               onChange={setSelectedHosts}
//             />
//           </Col>

//           <Col span={4}>
//             <Button type="primary" onClick={handleApplyFilters}>
//               Apply
//             </Button>
//           </Col>
//         </Row>

//         <Table
//           rowKey="key"
//           columns={columns}
//           dataSource={tableData}
//           loading={loadingTable}
//           pagination={{
//             current: currentPage,
//             pageSize,
//             total: tableData.length,
//             showSizeChanger: true,
//             onChange: (p, s) => {
//               setCurrentPage(p);
//               setPageSize(s);
//             },
//           }}
//         />
//       </Card>
//     </div>
//   );
// };

// export default HostFilterCard;
