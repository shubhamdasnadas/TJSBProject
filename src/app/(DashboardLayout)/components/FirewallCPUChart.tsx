"use client";

import { cx } from "@/lib/utils";
import { AreaChart, TooltipProps } from "./AreaChart";
import { useEffect, useState } from "react";

interface CPUDataPoint {
  clock: number;
  value: string;
}

interface CPUItem {
  itemid: string;
  name: string;
  key: string;
  history: CPUDataPoint[];
}

interface FormattedDataPoint {
  date: string;
  [key: string]: number | string;
}

const valueFormatter = (number: number) => {
  return `${number.toFixed(1)}%`;
};

const Tooltip = ({ payload, active, label }: TooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  // Only show the first item (single CPU)
  const item = payload[0];

  return (
    <>
      <div className="w-60 rounded-md border border-gray-500/10 bg-blue-500 px-4 py-1.5 text-sm shadow-md dark:border-gray-400/20 dark:bg-gray-900">
        <p className="flex items-center justify-between">
          <span className="text-gray-50 dark:text-gray-50">Time</span>
          <span className="font-medium text-gray-50 dark:text-gray-50">{label}</span>
        </p>
      </div>
      <div className="mt-1 w-60 space-y-1 rounded-md border border-gray-500/10 bg-white px-4 py-2 text-sm shadow-md dark:border-gray-400/20 dark:bg-gray-900">
        <div className="flex items-center space-x-2.5">
          <span
            className={cx("size-2.5 shrink-0 rounded-xs")}
            style={{ backgroundColor: item.color }}
            aria-hidden={true}
          />
          <div className="flex w-full justify-between">
            <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
            <span className="font-medium text-gray-900 dark:text-gray-50">
              {valueFormatter(item.value as number)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export function FirewallCPUChart({ initialData, initialCategories }: { initialData?: FormattedDataPoint[]; initialCategories?: string[] }) {
  const [chartData, setChartData] = useState<FormattedDataPoint[]>(initialData ?? []);
  const [categories, setCategories] = useState<string[]>(initialCategories ?? []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataUpdated, setDataUpdated] = useState(false);

  const fetchCPUData = async () => {
    if (!loading) setRefreshing(true);
    try {
      const res = await fetch("/api/zabbix/cpu", {
        method: "POST",
      });

      const response = await res.json();

      if (!response?.result?.history) {
        console.warn("No CPU history data received");
        setLoading(false);
        return;
      }

      const historyData: CPUItem[] = response.result.history;

      // Filter for only the specific CPU utilization key
      const targetCPU = historyData.find(
        (item) => item.key === "system.cpu.util[fgSysCpuUsage.0]"
      );

      if (!targetCPU) {
        console.warn("No data found for system.cpu.util[fgSysCpuUsage.0]");
        console.log("Available items:", historyData.map(item => item.key));
        setLoading(false);
        setChartData([]);
        return;
      }

      if (targetCPU.history.length === 0) {
        console.warn("No history data found for system.cpu.util[fgSysCpuUsage.0]");
        setLoading(false);
        setChartData([]);
        return;
      }

      // Format the data for the chart
      const formattedData: FormattedDataPoint[] = targetCPU.history.map((point) => {
        const clock = Number(point.clock);
        const valueNum = Number(point.value);
        return {
        date: new Date(clock * 1000).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        "CPU Utilization": isNaN(valueNum) ? 0 : valueNum,
      }});

      setChartData(formattedData);
      setCategories(["CPU Utilization"]);
      // Mark that data has been updated
      setDataUpdated(true);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching CPU data:", error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // If initial data is provided, use it and skip the first fetch
    if (initialData && initialData.length > 0) {
      setLoading(false);
    } else {
      fetchCPUData();
    }
    const interval = setInterval(fetchCPUData, 60000); // Refresh every 1 minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <p className="text-gray-400">Loading CPU data...</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center">
        <p className="text-gray-400">No CPU data available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-danger-900 dark:text-black-50">
          CPU UTILIZATION
        </h2>
      </div>

      {/* Refresh Button */}
      {dataUpdated && (
        <div className="flex items-center justify-end mb-4">
          <div className="relative group">
            <button
              onClick={() => {
                fetchCPUData();
                setDataUpdated(false);
              }}
              disabled={refreshing}
              accessKey="t"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
              
              {/* Popup that appears for 10 seconds */}
              <div className="popup absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap"
                   style={{ animation: 'popup-show 10s ease-in-out' }}>
                Alt + T
              </div>
              
              <style jsx>{`
                @keyframes popup-show {
                  0%, 5% { opacity: 1; }
                  95%, 100% { opacity: 0; }
                }
                
                .popup {
                  opacity: 0;
                  pointer-events: none;
                  animation: popup-show 10s ease-in-out;
                  animation-delay: 0.3s;
                }
              `}</style>
            </button>
          </div>
        </div>
      )}

      {/* Chart for larger screens */}
      <AreaChart
        className="hidden h-72 sm:block"
        data={chartData}
        index="date"
        categories={categories}
        type="default"
        colors={["blue"]}
        valueFormatter={valueFormatter}
        yAxisWidth={60}
        showLegend={true}
        showYAxis={true}
        customTooltip={Tooltip}
      />

      {/* Chart for mobile screens */}
      <AreaChart
        className="h-80 sm:hidden"
        data={chartData}
        index="date"
        categories={categories}
        type="default"
        colors={["blue"]}
        valueFormatter={valueFormatter}
        showYAxis={true}
        showLegend={true}
        startEndOnly={true}
        customTooltip={Tooltip}
      />
    </div>
  );
}
