"use client";

import { AreaChart } from "../AreaChart";

type HistoryPoint = {
  clock: number;
  value: string;
};

export function HistoryAreaChart({
  data,
  title,
  unit = "",
}: {
  data: HistoryPoint[];
  title: string;
  unit?: string;
}) {
  if (!data || data.length === 0) return null;

  const chartData = [...data]
    .reverse()
    .map((p) => ({
      time: new Date(p.clock * 1000).toLocaleTimeString(),
      value: Number(p.value),
    }));

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>

      <AreaChart
        className="h-64"
        data={chartData}
        index="time"
        categories={["value"]}
        colors={["blue"]}
        yAxisWidth={60}
        showYAxis
        showLegend={false}
        valueFormatter={(v) => `${v.toFixed(2)}${unit}`}
      />
    </div>
  );
}
