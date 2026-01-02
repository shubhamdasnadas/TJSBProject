"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Input,
  Select,
  Checkbox,
  Button,
  Row,
  Col,
  Space,
  Radio,
  Divider,
} from "antd";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* =========================
   TYPES
========================= */
interface Problem {
  eventid: string;
  time: string;
  status: string;
  host: string;
  problems: string;
  severity: string;
  duration: string;
  ack: string;
  message: string;
   
}


// temp



/* =========================
   PAGE
========================= */
export default   function SysReportPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  /* Update modal */
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<Problem | null>(null);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<string | null>(null);
  const [closeProblem, setCloseProblem] = useState(false);

  /* History modal */
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalTitle, setHistoryModalTitle] = useState("");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  /* History cache */
  const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>(
    {}
  );

  const pageSize = 10;

  /* =========================
     FETCH BASE DATA
  ========================= */
  const loadData = async () => {
    setLoading(true);
    setError(null);

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

  useEffect(() => {
    loadData();
  }, []);

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
   EXPORT PDF
========================= */
  const exportToPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");

    doc.text("Zabbix Timeline Report", 40, 30);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 48);

    autoTable(doc, {
      startY: 60,
      head: [
        [
          "Time",
          "Status",
          "Host",
          "Problem",
          "Severity",
          "Duration",
          "Ack",
          "Message",
        ],
      ],
      body: sorted.map((r) => [
        r.time,
        r.status,
        r.host,
        r.problems,
        r.severity,
        r.duration,
        r.ack,
        r.message,
      ]),
      styles: { fontSize: 9 },
    });

    doc.save("zabbix_timeline_report.pdf");
  };

  /* =========================
     UPDATE PROBLEM
  ========================= */
  const openUpdateModal = (row: Problem) => {
    setSelected(row);
    setMessage("");
    setSeverity(null);
    setCloseProblem(false);
    setShowModal(true);
  };

  const submitUpdate = async () => {
    if (!selected) return;

    const res = await fetch("/api/reports/update-problem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventid: selected.eventid,
        message,
        severity,
        closeProblem,
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      alert(json.error || "Update failed");
      return;
    }

    setShowModal(false);
    loadData();
  };

 
 
 
  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ padding: 24 }}>
      <h2>Zabbix Timeline</h2>

      <Button type="primary" onClick={exportToPDF} style={{ marginBottom: 12 }}>
        Export to PDF
      </Button>

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
            <th>Ack</th>
            <th>Message</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={10}>Loading…</td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={10} style={{ color: "red" }}>
                {error}
              </td>
            </tr>
          ) : pageItems.length === 0 ? (
            <tr>
              <td colSpan={10}>No data</td>
            </tr>
          ) : (
            pageItems.map((p) => (
              <tr key={p.eventid}>
                <td>{p.time}</td>
                <td>{p.status}</td>
                <td>{p.host}</td>
                <td>{p.problems}</td>
                <td>
                  <Button
                    size="small"
                    disabled={p.status === "Resolved"}
                    onClick={() => openUpdateModal(p)}
                  >
                    Update
                  </Button>
                </td>
                <td>{p.severity}</td>
                 <td>{p.duration}</td>
                <td>{p.ack}</td>
                <td>{p.message}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ marginTop: 10 }}>
        <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
          Prev
        </button>
        <span>
          {" "}
          Page {page} / {totalPages}{" "}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>

      {/* UPDATE MODAL */}
      <Modal
        title="Update problem"
        open={showModal}
        onCancel={() => setShowModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowModal(false)}>
            Cancel
          </Button>,
          <Button
            key="update"
            type="primary"
            onClick={submitUpdate}
            disabled={!message && !severity && !closeProblem}
          >
            Update
          </Button>,
        ]}
      >
        {selected && (
          <>
            <b>Problem</b>
            <div style={{ marginBottom: 10 }}>{selected.problems}</div>

            <Input.TextArea
              rows={4}
              placeholder="Add acknowledge message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <Select
              style={{ width: "100%", marginTop: 10 }}
              allowClear
              placeholder="Change severity"
              value={severity}
              onChange={(v) => setSeverity(v)}
              options={[
                { value: "0", label: "Not classified" },
                { value: "1", label: "Information" },
                { value: "2", label: "Warning" },
                { value: "3", label: "Average" },
                { value: "4", label: "High" },
                { value: "5", label: "Disaster" },
              ]}
            />

            <Checkbox
              style={{ marginTop: 10 }}
              checked={closeProblem}
              onChange={(e) => setCloseProblem(e.target.checked)}
            >
              Close problem
            </Checkbox>
          </>
        )}
      </Modal>

      {/* HISTORY MODAL */}
      <Modal
        title={historyModalTitle}
        open={historyModalOpen}
        onCancel={() => setHistoryModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setHistoryModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={700}
      >
        {!activeEventId ? (
          <div>No data</div>
        ) : historyLoading[activeEventId] ? (
          <div>Loading history…</div>
        ) : !historyMap[activeEventId] ||
          historyMap[activeEventId].length === 0 ? (
          <div>No history found</div>
        ) : (
          <table width="100%" border={1} cellPadding={6}>
            <thead>
              <tr>
                <th style={{ width: 220 }}>Timestamp</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {historyMap[activeEventId].map((h, i) => (
                <tr key={i}>
                  <td>
                    {new Date(Number(h.clock) * 1000).toLocaleString()}
                  </td>
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
