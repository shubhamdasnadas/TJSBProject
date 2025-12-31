"use client";
import { useEffect, useMemo, useState } from "react";

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

/* =========================
   PAGE
========================= */
export default function SysReportPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const pageSize = 10;

  /* =========================
     FETCH DATA
  ========================= */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/reports/sysreport");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load data");
        }

        setProblems(data);
        setPage(1);
      } catch (e: any) {
        setError(e.message);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  /* =========================
     SORT (Unack first)
  ========================= */
  const sorted = useMemo(() => {
    return [...problems].sort((a, b) => {
      if (a.ack === "No" && b.ack === "Yes") return -1;
      if (a.ack === "Yes" && b.ack === "No") return 1;
      return 0;
    });
  }, [problems]);

  /* =========================
     PAGINATION
  ========================= */
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  const handlePrev = () => setPage(p => Math.max(1, p - 1));
  const handleNext = () => setPage(p => Math.min(totalPages, p + 1));

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ padding: "12px" }}>
      <h2>Zabbix Problems</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "10px"
        }}
      >
        <thead>
          <tr>
            <th>Time</th>
            <th>Status</th>
            <th>Host</th>
            <th>Problem</th>
            <th>Severity</th>
            <th>Duration</th>
            <th>Ack</th>
            <th>Message</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={8}>Loading…</td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={8} style={{ color: "red" }}>
                {error}
              </td>
            </tr>
          ) : pageItems.length === 0 ? (
            <tr>
              <td colSpan={8}>No problems found</td>
            </tr>
          ) : (
            pageItems.map(p => (
              <tr key={p.eventid}>
                <td>{p.time}</td>
                <td>{p.status}</td>
                <td>{p.host}</td>
                <td>{p.problems}</td>
                <td className={`sev-${p.severity}`}>{p.severity}</td>
                <td>{p.duration}</td>
                <td>{p.ack}</td>
                <td>{p.message}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          gap: "8px",
          alignItems: "center"
        }}
      >
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          accessKey="p"
          title="Previous page (Alt + P)"
        >
          Prev
        </button>

        <span>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          accessKey="n"
          title="Next page (Alt + N)"
        >
          Next
        </button>
      </div>
    </div>
  );
}
