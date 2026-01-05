"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Select, Button } from "antd";
import axios from "axios";
import RangePickerDemo from "../../RangePickerDemo";

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
  const [rows, setRows] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  /* pagination */
  const [page, setPage] = useState(1);
  const pageSize = 10;

  /* filters */
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  /* history modal */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeRow, setActiveRow] = useState<Problem | null>(null);

  /* time range */
  const [range, setRange] = useState<{
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  }>({});

  /* =========================
     AXIOS CONFIG (proxy)
  ========================= */
  const axiosCfg = {
    headers: {
      "Content-Type": "application/json-rpc",
      Authorization: `Bearer ${localStorage.getItem("zabbix_auth")}`,
    },
  };

  /* =========================
     LOAD TABLE DATA
  ========================= */
  const loadData = async () => {
    setLoading(true);
    const res = await fetch("/api/reports/sysreport");
    const data = await res.json();
    setRows(data);
    setLoading(false);
  };

  /* =========================
     HOST GROUPS
  ========================= */
  const loadHostGroups = async () => {
    const payload = {
      jsonrpc: "2.0",
      method: "hostgroup.get",
      params: { output: ["groupid", "name"] },
      id: 1,
    };

    const res = await axios.post("/api/zabbix-proxy", payload, axiosCfg);
    setHostGroups(res.data.result ?? []);
  };

  /* =========================
     HOSTS
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

    const res = await axios.post("/api/zabbix-proxy", payload, axiosCfg);
    setHosts(res.data.result ?? []);
  };

  /* =========================
     APPLY FILTER
  ========================= */
  const handleApply = async () => {
    setLoadingTable(true);
    setPage(1);

    if (selectedHosts.length) {
      setRows((r) => r.filter((x) => selectedHosts.includes(x.host)));
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
      [...rows].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      ),
    [rows]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  /* =========================
     VIEW → HISTORY (EXACT PAYLOAD)
  ========================= */
  const loadHistory = async (row: Problem) => {
    setActiveRow(row);
    setHistoryTitle(`${row.host} – ${row.problems}`);
    setHistoryOpen(true);
    setHistoryLoading(true);

    const now = Math.floor(Date.now() / 1000);
    const toUnix = (d?: string, t?: string) =>
      d && t ? Math.floor(new Date(`${d} ${t}`).getTime() / 1000) : undefined;

    const time_from =
      toUnix(range.startDate, range.startTime) ?? now - 3600;
    const time_till =
      toUnix(range.endDate, range.endTime) ?? now;

    try {
      const payload = {
        jsonrpc: "2.0",
        method: "history.get",
        params: {
          output: "extend",
          history: 0,
          itemids: [row.itemid],
          time_from,
          time_till,
          sortfield: "clock",
          sortorder: "DESC",
        },
        id: 1,
      };

      const res = await axios.post(
        "/api/zabbix-proxy",
        payload,
        axiosCfg
      );

      setHistoryData(res.data.result ?? []);
    } catch (e) {
      console.error("history.get failed:", e);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
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
          placeholder="Host Groups"
          style={{ width: 240 }}
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
          placeholder="Hosts"
          style={{ width: 240 }}
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
            <th>Severity</th>
            <th>Duration</th>
            <th>View</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7}>Loading…</td></tr>
          ) : (
            pageItems.map((r) => (
              <tr key={r.eventid}>
                <td>{r.time}</td>
                <td>{r.status}</td>
                <td>{r.host}</td>
                <td>{r.problems}</td>
                <td>{r.severity}</td>
                <td>{r.duration}</td>
                <td>
                  <Button size="small" onClick={() => loadHistory(r)}>
                    View
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div style={{ marginTop: 12 }}>
        <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </Button>
        <span style={{ margin: "0 10px" }}>
          Page {page} / {totalPages}
        </span>
        <Button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>

      {/* HISTORY MODAL */}
      <Modal
        title={historyTitle}
        open={historyOpen}
        onCancel={() => setHistoryOpen(false)}
        footer={null}
        width={800}
      >
        <RangePickerDemo
          onRangeChange={(r) => {
            setRange(r);
            if (activeRow) loadHistory(activeRow);
          }}
        />

        {historyLoading ? (
          <div>Loading history…</div>
        ) : (
          <table width="100%" border={1} cellPadding={6}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {historyData.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.clock * 1000).toLocaleString()}</td>
                  <td>{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
