"use client";
import { useState, useEffect } from "react";

interface Problem {
  time: string;
  status: string;
  host: string;
  severity: string;
  duration: string;
  ack: string;
  message: string;
  eventid: string;
}

const SysReportPage = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/reports/sysreport");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setProblems(data);
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div>
      <h2>Zabbix Problems</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Status</th>
            <th>Host</th>
            <th>Severity</th>
            <th>Duration</th>
            <th>Ack</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7}>Loading…</td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={7} style={{ color: 'red' }}>{error}</td>
            </tr>
          ) : (
            problems.map((p) => (
              <tr key={p.eventid}>
                <td>{p.time}</td>
                <td>{p.status}</td>
                <td>{p.host}</td>
                <td className={`sev-${p.severity}`}>{p.severity}</td>
                <td>{p.duration}</td>
                <td>{p.ack}</td>
                <td>{p.message}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SysReportPage;
