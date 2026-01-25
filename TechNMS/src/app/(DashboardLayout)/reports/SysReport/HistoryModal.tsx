"use client";

import { useState, useEffect, useRef } from "react";
import { Modal, Button, Space, Table, message } from "antd";
import { exportHistoryPdf } from "./dataFile";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import RangePickerDemo from "../../RangePickerDemo2"; // adjust path as needed

// Assume exported from ./utils.ts or define here
const getAxiosConfig = () => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("zabbix_auth") || ""}`,
  },
});

const downsampleData = (data: HistoryPoint[], maxPoints: number): HistoryPoint[] => {
  if (data.length <= maxPoints) return [...data];

  const result: HistoryPoint[] = [];
  const step = Math.ceil(data.length / maxPoints);

  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }

  if (result[result.length - 1]?.clock !== data[data.length - 1]?.clock) {
    result.push(data[data.length - 1]);
  }

  return result;
};

interface HistoryPoint {
  clock: number;
  value: number | string;
  isTrigger?: boolean;
  triggerName?: string;
  severity?: number;
}

const INITIAL_DAYS = 3;
const CHUNK_DAYS = 30;
const MAX_CHART_POINTS = 1200;
const POLLING_DELAY_MS = 4800;

const HistoryModal = ({
  open,
  onClose,
  title,
  host,
  item,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  host: string;
  item: { itemid: string; name: string; host: string; valueType?: number } | null;
}) => {
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [chartData, setChartData] = useState<HistoryPoint[]>([]);
  const [allHistoryData, setAllHistoryData] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loadPhase, setLoadPhase] = useState<
    "idle" | "recent" | "older" | "complete" | "failed"
  >("idle");
  const [oldestLoadedClock, setOldestLoadedClock] = useState<number>(Infinity);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState<{
    startDate: string;
    startTime?: string;
    endDate: string;
    endTime?: string;
  }>({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    if (!open || !item?.itemid) return;

    setHistoryLoading(true);
    setLoadPhase("recent");
    setAllHistoryData([]);
    setHistoryData([]);
    setChartData([]);
    setOldestLoadedClock(Infinity);

    loadRecentHistory(item.itemid, item.valueType);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [open, item?.itemid, item?.valueType]);

  const loadRecentHistory = async (itemid: string, valueType?: number) => {
    setHistoryLoading(true);
    setLoadPhase("recent");

    const targetHistory = valueType ?? 3;
    const nowSec = Math.floor(Date.now() / 1000);
    const recentFrom = nowSec - INITIAL_DAYS * 86400;

    try {
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const recentRes = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "history.get",
          params: {
            output: "extend",
            history: targetHistory,
            itemids: [itemid],
            time_from: recentFrom,
            time_till: nowSec,
            sortfield: "clock",
            sortorder: "ASC",
            limit: 30000,
          },
          id: 200,
        },
        { ...getAxiosConfig(), signal }
      );

      let recentPoints: HistoryPoint[] = (recentRes.data.result ?? []).map((h: any) => ({
        clock: Number(h.clock),
        value: isNaN(Number(h.value)) || h.value === "" ? h.value : Number(h.value),
        isTrigger: false,
      }));

      if (!recentPoints.length) {
        message.warning("No recent history data found");
        setHistoryLoading(false);
        setLoadPhase("complete");
        return;
      }

      const sortedRecent = [...recentPoints].sort((a, b) => b.clock - a.clock);
      setAllHistoryData(sortedRecent);
      setHistoryData(sortedRecent);

      const oldToNew = [...recentPoints].sort((a, b) => a.clock - b.clock);
      setChartData(downsampleData(oldToNew, MAX_CHART_POINTS));

      setOldestLoadedClock(recentPoints[0]?.clock ?? Infinity);
      message.success(`Loaded ${sortedRecent.length} recent points (${INITIAL_DAYS} days)`);

      setHistoryLoading(false);

      const loadOlderChunks = async () => {
        if (loadPhase !== "recent" && loadPhase !== "older") return;
        if (signal.aborted) return;

        setLoadPhase("older");

        const chunkEnd = oldestLoadedClock - 1;
        if (chunkEnd <= 0) {
          setLoadPhase("complete");
          return;
        }

        const chunkStart = Math.max(
          chunkEnd - CHUNK_DAYS * 86400,
          nowSec - 365 * 86400
        );

        if (chunkStart >= chunkEnd) {
          setLoadPhase("complete");
          return;
        }

        try {
          const olderRes = await axios.post(
            "/api/zabbix-proxy",
            {
              jsonrpc: "2.0",
              method: "history.get",
              params: {
                output: "extend",
                history: targetHistory,
                itemids: [itemid],
                time_from: chunkStart,
                time_till: chunkEnd,
                sortfield: "clock",
                sortorder: "ASC",
              },
              id: 201,
            },
            { ...getAxiosConfig(), signal }
          );

          const olderPoints: HistoryPoint[] = (olderRes.data.result ?? []).map((h: any) => ({
            clock: Number(h.clock),
            value: isNaN(Number(h.value)) || h.value === "" ? h.value : Number(h.value),
            isTrigger: false,
          }));

          if (!olderPoints.length) {
            setLoadPhase("complete");
            return;
          }

          setAllHistoryData((prev) => {
            const merged = [...olderPoints, ...prev];
            return merged.sort((a, b) => b.clock - a.clock);
          });

          setChartData((prev) => {
            const combined = [...olderPoints, ...prev].sort((a, b) => a.clock - b.clock);
            return downsampleData(combined, MAX_CHART_POINTS);
          });

          setOldestLoadedClock(olderPoints[0].clock);

          setTimeout(loadOlderChunks, POLLING_DELAY_MS);
        } catch (err: any) {
          if (err.name !== "CanceledError") {
            console.error("Older chunk failed:", err);
            setLoadPhase("failed");
          }
        }
      };

      setTimeout(loadOlderChunks, 2200);
    } catch (err: any) {
      if (err.name !== "CanceledError") {
        console.error("Recent history failed:", err);
        message.error("Failed to load history");
        setLoadPhase("failed");
      }
      setHistoryLoading(false);
    }
  };

  const exportHistoryToPDF = async (
    title: string,
    host: string,
    data: HistoryPoint[],
    chartEl: HTMLDivElement | null
  ) => {
    if (!chartEl) {
      message.error("Chart not ready for export");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const html2canvas = (await import("html2canvas")).default;

      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;

      doc.setFontSize(18);
      doc.text(`History Report: ${title}`, margin, 60);
      doc.setFontSize(14);
      doc.text(`Host: ${host}`, margin, 90);

      const canvas = await html2canvas(chartEl, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", margin, 130, pageWidth - margin * 2, 220);

      autoTable(doc, {
        startY: 380,
        head: [["Time", "Value"]],
        body: data.map((item) => [
          new Date(item.clock * 1000).toLocaleString(),
          typeof item.value === "number" ? item.value.toFixed(2) : item.value || "—",
        ]),
        theme: "grid",
        styles: { fontSize: 9, cellPadding: 5 },
      });

      doc.save(`techsec_history_${host.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`);
      message.success("PDF exported successfully");
    } catch (err) {
      console.error("PDF export failed:", err);
      message.error("Failed to export PDF");
    }
  };

  return (
    <Modal
      title={`${host || "Unknown Host"} – ${title || "History"}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space
          style={{
            justifyContent: "space-between",
            width: "100%",
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 300 }}>
            <RangePickerDemo
              onRangeChange={(newRange) => {
                setDateRange(newRange);

                if (!newRange?.startDate || !newRange?.endDate || !allHistoryData?.length) {
                  setHistoryData([]);
                  setChartData([]);
                  return;
                }

                const startTime = newRange.startTime || "00:00:00";
                const endTime = newRange.endTime || "23:59:59";

                const startDateObj = new Date(`${newRange.startDate} ${startTime}`);
                const endDateObj = new Date(`${newRange.endDate} ${endTime}`);

                if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
                  message.warning("Invalid date/time format");
                  setHistoryData([]);
                  setChartData([]);
                  return;
                }

                let startSec = Math.floor(startDateObj.getTime() / 1000);
                const endSec = Math.floor(endDateObj.getTime() / 1000);

                if (startSec < oldestLoadedClock && oldestLoadedClock !== Infinity) {
                  message.warning(
                    `Oldest available data is from ${new Date(
                      oldestLoadedClock * 1000
                    ).toLocaleDateString()}. Adjusting range start.`
                  );

                  const adjustedStartDate = new Date(oldestLoadedClock * 1000)
                    .toISOString()
                    .split("T")[0];

                  setDateRange({
                    ...newRange,
                    startDate: adjustedStartDate,
                  });

                  const adjustedStartObj = new Date(`${adjustedStartDate} ${startTime}`);
                  startSec = Math.floor(adjustedStartObj.getTime() / 1000);
                }

                const filtered = allHistoryData.filter(
                  (p) => p.clock >= startSec && p.clock <= endSec
                );

                setHistoryData(filtered);

                const sorted = [...filtered].sort((a, b) => a.clock - b.clock);
                setChartData(downsampleData(sorted, MAX_CHART_POINTS));
              }}
            />

          </div>

          <Space>
            <Button
              onClick={() => {
                if (item?.itemid) {
                  loadRecentHistory(item.itemid, item.valueType);
                }
              }}
            >
              Refresh
            </Button>

        <Button
          type="primary"
          onClick={() =>
            exportHistoryPdf({
              title,
              host,
              rows: historyData,
              chartEl: chartRef.current,
            })
          }
        >
          Export PDF
        </Button>
          </Space>
        </Space>

        {/* Loading status */}
        {loadPhase === "recent" && (
          <div style={{ color: "#1890ff", margin: "12px 0", fontWeight: 500 }}>
            Loading recent data (last {INITIAL_DAYS} days)...
          </div>
        )}
        {loadPhase === "older" && (
          <div style={{ color: "#faad14", margin: "12px 0" }}>
            Loading older history... ({allHistoryData.length} points loaded)
          </div>
        )}
        {loadPhase === "complete" && (
          <div style={{ color: "#52c41a", margin: "12px 0", fontWeight: 500 }}>
            All available history loaded
          </div>
        )}
        {loadPhase === "failed" && (
          <div style={{ color: "#f5222d", margin: "12px 0" }}>
            Loading stopped due to error
          </div>
        )}

        {/* Chart with oldest marker */}
        <div
          ref={chartRef}
          style={{
            background: "#fff",
            padding: 16,
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <ResponsiveContainer height={260}>
            <LineChart data={chartData.length ? chartData : historyData}>
<XAxis
  dataKey="clock"
  type="number"
  domain={[
    (dataMin: number) => dataMin,
    (dataMax: number) => dataMax
  ]}
  allowDataOverflow={false}
  tickFormatter={(v: number) => new Date(v * 1000).toLocaleTimeString()}
/>
              <YAxis />
              <Tooltip
                labelFormatter={(v: number) => new Date(v * 1000).toLocaleString()}
                formatter={(value: any) =>
                  typeof value === "number" ? value.toFixed(2) : value
                }
              />
              <Line
                type="linear"
                dataKey="value"
                stroke="#1890ff"
                strokeWidth={2}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  const dataSet = chartData.length ? chartData : historyData;
                  const isOldest = payload.clock === Math.min(...dataSet.map((d) => d.clock));

                  if (isOldest) {
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={6} fill="#52c41a" stroke="#fff" strokeWidth={2} />
                        <text x={cx + 10} y={cy - 15} fontSize={11} fill="#52c41a" fontWeight="bold">
                         
                        </text>
                      </g>
                    );
                  }
                  return null;
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Table with oldest row label */}
        <Table
          size="small"
          loading={historyLoading}
          dataSource={historyData.map((r, i) => ({
            key: `${r.clock}-${i}`,
            ...r,
          }))}
          columns={[
            {
              title: "Time",
              dataIndex: "clock",
              width: 180,
              render: (clock: number, record: any, index: number) => (
                <span>
                  {new Date(clock * 1000).toLocaleString()}
                  {index === historyData.length - 1 && historyData.length > 0 && (
                    <span style={{ color: "#52c41a", marginLeft: 8, fontWeight: 500 }}>← Oldest</span>
                  )}
                </span>
              ),
            },
            {
              title: "Value",
              dataIndex: "value",
              render: (v: any) =>
                typeof v === "number" ? v.toFixed(2) : v || "—",
            },
          ]}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ y: 300 }}
        />
      </Space>
    </Modal>
  );
};

export default HistoryModal;