"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  CartesianGrid,
} from "recharts";
import { Table, Select, Card, Spin, message } from "antd";

type Host = { hostid: string; name: string };
type Item = { itemid: string; name: string; units: string };
type Trigger = {
  triggerid: string;
  description: string;
  priority: number;
  lastchange: number;
};

type HistoryPoint = { time: number; val: number };

export default function SysReportPage() {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  const [hostId, setHostId] = useState<string>();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(false);

  const timeTill = Math.floor(Date.now() / 1000);
  const timeFrom = timeTill - 86400; // last 24h

  /* =========================
     LOAD HOSTS
  ========================= */
  useEffect(() => {
    fetch("/api/zabbix-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "host.get",
        params: { output: ["hostid", "name"] },
        id: 1,
      }),
    })
      .then(res => res.json())
      .then(d => {
        console.log("Hosts response:", d);
        if (d.error) {
          console.error("Zabbix Error:", d.error);
          message.error("Failed to load hosts: " + (d.error.data || d.error.message));
          setHosts([]);
        } else if (d.result) {
          setHosts(d.result);
        } else {
          setHosts([]);
        }
      })
      .catch(err => {
        console.error("Fetch failed:", err);
        message.error("Connection error: " + err.message);
      });
  }, []);

  /* =========================
     LOAD ITEMS
  ========================= */
  useEffect(() => {
    if (!hostId) return;

    fetch("/api/zabbix-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "item.get",
        params: {
          output: ["itemid", "name", "units"],
          hostids: hostId,
        },
        id: 2,
      }),
    })
      .then(res => res.json())
      .then(d => {
        console.log("Items response:", d);
        if (d.error) {
          console.error("Zabbix Error:", d.error);
          message.error("Failed to load items: " + (d.error.data || d.error.message));
          setItems([]);
        } else if (d.result) {
          setItems(d.result);
        } else {
          setItems([]);
        }
      })
      .catch(err => {
        console.error("Fetch failed:", err);
        message.error("Connection error: " + err.message);
      });
  }, [hostId]);

  /* =========================
     LOAD HISTORY + TRIGGERS
  ========================= */
  useEffect(() => {
    if (!item) return;
    setLoading(true);

    Promise.all([
      fetch("/api/zabbix-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "history.get",
          params: {
            output: "extend",
            history: 0,
            itemids: item.itemid,
            time_from: timeFrom,
            time_till: timeTill,
            sortfield: "clock",
            sortorder: "ASC",
          },
          id: 3,
        }),
      }).then(r => r.json()),

      fetch("/api/zabbix-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "trigger.get",
          params: {
            output: ["triggerid", "description", "priority", "lastchange"],
            itemids: item.itemid,
          },
          id: 4,
        }),
      }).then(r => r.json()),
    ])
      .then(([h, t]) => {
        console.log("History response:", h);
        console.log("Triggers response:", t);

        if (h.error) {
          console.error("History Error:", h.error);
          setHistory([]);
        } else if (h.result) {
          setHistory(
            h.result.map((x: any) => ({
              time: Number(x.clock) * 1000,
              val: Number(x.value),
            }))
          );
        }

        if (t.error) {
          console.error("Trigger Error:", t.error);
          setTriggers([]);
        } else if (t.result) {
          setTriggers(t.result);
        }
      })
      .catch(err => {
        console.error("Fetch failed:", err);
        message.error("Connection error: " + err.message);
      })
      .finally(() => setLoading(false));
  }, [item]);

  /* =========================
     TABLE
  ========================= */
  const columns = [
    { title: "Trigger", dataIndex: "description" },
    {
      title: "Severity",
      dataIndex: "priority",
      render: (p: number) =>
        ["OK", "Info", "Warning", "Average", "High", "Disaster"][p],
    },
    {
      title: "Time",
      dataIndex: "lastchange",
      render: (t: number) => new Date(t * 1000).toLocaleString(),
    },
  ];

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      <Card className="mb-4">
        <Select
          placeholder="Select Host"
          className="w-64 mr-3"
          onChange={setHostId}
          options={Array.isArray(hosts) ? hosts.map(h => ({ value: h.hostid, label: h.name })) : []}
        />

        <Select
          placeholder="Select Item"
          className="w-96"
          onChange={(id) =>
            setItem(items.find(i => i.itemid === id) || null)
          }
          options={items.map(i => ({
            value: i.itemid,
            label: i.name,
          }))}
        />
      </Card>

      <Card className="mb-6">
        {!item ? (
          <div className="h-96 flex items-center justify-center text-gray-400">
            <p className="text-lg">👈 Select a Host and Item to view the chart</p>
          </div>
        ) : loading ? (
          <div className="h-96 flex items-center justify-center">
            <Spin size="large" tip="Loading chart data..." />
          </div>
        ) : history.length === 0 ? (
          <div className="h-96 flex items-center justify-center text-gray-400">
            <p className="text-lg">📊 No data available for this item in the last 24 hours</p>
          </div>
        ) : (
          <div style={{ height: 420 }}>
            <div className="mb-2 text-sm text-gray-300">
              <span className="font-semibold">{item?.name}</span> - {history.length} data points
              {triggers.length > 0 && <span className="ml-4">🔴 {triggers.length} triggers</span>}
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(t) => new Date(t).toLocaleTimeString()}
                  stroke="#94a3b8"
                />
                <YAxis 
                  label={{ value: item?.units || "Value", angle: -90, position: "insideLeft" }}
                  stroke="#94a3b8"
                />
                <Tooltip
                  labelFormatter={(t) =>
                    new Date(t as number).toLocaleString()
                  }
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569" }}
                  formatter={(value) => [value, item?.name || "Value"]}
                />

                <Line
                  type="monotone"
                  dataKey="val"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />

                {/* 🔴 RED DOTS WHERE TRIGGERS OCCURRED */}
                {triggers.length > 0 && triggers.map((tr, idx) => {
                  const triggerTime = Number(tr.lastchange) * 1000; // convert seconds to milliseconds
                  
                  // Find the CLOSEST history point to the trigger time
                  let closestPoint: HistoryPoint | null = null;
                  let minDiff = Infinity;
                  
                  history.forEach(h => {
                    const timeDiff = Math.abs(h.time - triggerTime);
                    if (timeDiff < minDiff) {
                      minDiff = timeDiff;
                      closestPoint = h;
                    }
                  });
                  
                  return (
                    closestPoint && (
                      <ReferenceDot
                        key={`trigger-${tr.triggerid}-${idx}`}
                        x={closestPoint.time}
                        y={closestPoint.val}
                        r={8}
                        fill="#ef4444"
                        stroke="#dc2626"
                        strokeWidth={2}
                      />
                    )
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <Table
          rowKey="triggerid"
          columns={columns}
          dataSource={triggers}
          pagination={false}
        />
      </Card>
    </div>
  );
}
 