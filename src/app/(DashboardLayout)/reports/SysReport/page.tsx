"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Input, Select, Checkbox, Button, message } from "antd";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import RangePickerDemo from "../../RangePickerDemo";

/* =========================
   AXIOS CONFIG (FIXED)
========================= */
const getAxiosCfg = () => ({
  headers: {
    "Content-Type": "application/json-rpc",
    Authorization: `Bearer ${localStorage.getItem("zabbix_auth")}`,
  },
});

/* =========================
   TYPES
========================= */
interface Problem {
  eventid: string;
  itemid: string;
  time: string;
  status: string;
  host: string;
  problems: string;
  severity: string;
  duration: string;
  ack: string;
  message: string;
}

interface HostGroup {
  groupid: string;
  name: string;
}

interface Host {
  hostid: string;
  name: string;
}

/* =========================
   PAGE
========================= */
export default function SysReportPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* pagination */
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* =========================
     FILTER STATE
  ========================= */
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  /* =========================
     UPDATE MODAL
  ========================= */
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Problem | null>(null);
  const [messageText, setMessageText] = useState("");
  const [severity, setSeverity] = useState<string | null>(null);
  const [closeProblem, setCloseProblem] = useState(false);

  /* =========================
     HISTORY MODAL
  ========================= */
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalTitle, setHistoryModalTitle] = useState("");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>(
    {}
  );

  /* =========================
     RANGE PICKER
  ========================= */
  const [timeRange, setTimeRange] = useState<{
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  }>({});

  /* =========================
     BASE DATA
  ========================= */
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/sysreport");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProblems(data);
      setPage(1);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     HOST GROUPS (FIXED)
  ========================= */
  const loadHostGroups = async () => {
    const payload = {
      jsonrpc: "2.0",
      method: "hostgroup.get",
      params: { output: ["groupid", "name"] },
      id: 1,
    };

    const res = await axios.post(
      "/api/zabbix-proxy",
      payload,
      getAxiosCfg()
    );

    setHostGroups(res.data.result ?? []);
  };

  /* =========================
     HOSTS (FIXED)
  ========================= */
  const loadHosts = async (groups: string[]) => {
    if (!groups.length) return setHosts([]);

    const payload = {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        output: ["hostid", "name"],
        groupids: groups,
      },
      id: 2,
    };

    const res = await axios.post(
      "/api/zabbix-proxy",
      payload,
      getAxiosCfg()
    );

    setHosts(res.data.result ?? []);
  };

  /* =========================
     APPLY FILTER
  ========================= */
  const handleApply = async () => {
    setLoadingTable(true);
    setPage(1);

    if (selectedHosts.length) {
      setProblems((p) =>
        p.filter((r) => selectedHosts.includes(r.host))
      );
    } else {
      await loadData();
    }

    setLoadingTable(false);
  };

  /* =========================
     INIT
  ========================= */
  useEffect(() => {
    loadHostGroups();
    loadData();
  }, []);

  useEffect(() => {
    loadHosts(groupIds);
  }, [groupIds]);

  /* =========================
     SORT + PAGINATION
  ========================= */
  const sorted = useMemo(
    () =>
      [...problems].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      ),
    [problems]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  
  /* =========================
     HISTORY
  ========================= */
const loadHistory = async (row: Problem) => {
  const eventId = row.eventid;

  setHistoryModalTitle(`${row.host} – ${row.problems}`);
  setActiveEventId(eventId);
  setHistoryModalOpen(true);

  // cache only when no custom range
  if (historyMap[eventId] && !timeRange.startDate) return;

  setHistoryLoading((p) => ({ ...p, [eventId]: true }));

  try {
    const auth = localStorage.getItem("zabbix_auth");
    if (!auth) throw new Error("Missing Zabbix auth token");

    const res = await fetch("/api/dashboard_action_log/history_get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json-rpc", // 🔥 FIX
      },
      body: JSON.stringify({
        itemids: [row.itemid],
        auth,               // ✔ correct for this route
        history: 0,
        ...timeRange,       // ✔ picker driven
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json?.error || "history.get failed");
    }

    setHistoryMap((p) => ({
      ...p,
      [eventId]: json.result || [],
    }));
  } catch (e) {
    console.error("history.get error:", e);
    setHistoryMap((p) => ({ ...p, [eventId]: [] }));
  } finally {
    setHistoryLoading((p) => ({ ...p, [eventId]: false }));
  }
};

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ padding: 24 }}>
      <h2>Zabbix Timeline</h2>

      {/* FILTER BAR */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Select
          mode="multiple"
          allowClear
          placeholder="Select Host Groups"
          style={{ width: 260 }}
          value={groupIds}
          onChange={setGroupIds}
          options={hostGroups.map((g) => ({
            value: g.groupid,
            label: g.name,
          }))}
        />

        <Select
          mode="multiple"
          allowClear
          placeholder="Select Hosts"
          style={{ width: 260 }}
          value={selectedHosts}
          onChange={setSelectedHosts}
          options={hosts.map((h) => ({
            value: h.name,
            label: h.name,
          }))}
        />

        <Button type="primary" loading={loadingTable} onClick={handleApply}>
          Apply
        </Button>
      </div>

      {/* TABLE */}
      <table width="100%" border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Status</th>
            <th>Host</th>
            <th>Problem</th>
            <th>Action</th>
            <th>Severity</th>
            <th>Duration</th>
            <th>View</th>
            <th>Ack</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={10}>Loading…</td></tr>
          ) : error ? (
            <tr><td colSpan={10}>{error}</td></tr>
          ) : pageItems.length === 0 ? (
            <tr><td colSpan={10}>No data</td></tr>
          ) : (
            pageItems.map((p) => (
              <tr key={p.eventid}>
                <td>{p.time}</td>
                <td>{p.status}</td>
                <td>{p.host}</td>
                <td>{p.problems}</td>
                <td>
                  <Button size="small" onClick={() => setSelected(p)}>
                    Update
                  </Button>
                </td>
                <td>{p.severity}</td>
                <td>{p.duration}</td>
                <td>
                  <Button size="small" onClick={() => loadHistory(p)}>
                    View
                  </Button>
                </td>
                <td>{p.ack}</td>
                <td>{p.message}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
