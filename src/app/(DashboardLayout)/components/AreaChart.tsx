"use client";

import React from "react";
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface AreaChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  yAxisWidth?: number;
  showLegend?: boolean;
  showYAxis?: boolean;
  startEndOnly?: boolean;
  className?: string;
  customTooltip?: React.ComponentType<TooltipProps>;
  type?: "default" | "stacked" | "percent";
}

const chartColors: Record<string, string> = {
  blue: "#3b82f6",
  cyan: "#06b6d4",
  violet: "#8b5cf6",
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
  purple: "#a855f7",
  orange: "#f97316",
};

export function AreaChart({
  data,
  index,
  categories,
  colors = ["blue"],
  valueFormatter = (value) => value.toString(),
  yAxisWidth = 56,
  showLegend = true,
  showYAxis = true,
  startEndOnly = false,
  className,
  customTooltip,
  type = "default",
}: AreaChartProps) {
  const CustomTooltip = customTooltip;

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey={index}
            tick={{ fontSize: 12 }}
            tickLine={false}
            className="text-gray-500 dark:text-gray-400"
            ticks={startEndOnly && data.length > 0 ? [data[0][index], data[data.length - 1][index]] : undefined}
          />
          {showYAxis && (
            <YAxis
              width={yAxisWidth}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
              className="text-gray-500 dark:text-gray-400"
            />
          )}
          <Tooltip
            content={
              CustomTooltip ? (
                <CustomTooltip />
              ) : (
                <DefaultTooltipContent valueFormatter={valueFormatter} />
              )
            }
          />
          {categories.map((category, idx) => (
            <Area
              key={category}
              type="monotone"
              dataKey={category}
              stroke={chartColors[colors[idx % colors.length]] || chartColors.blue}
              fill={chartColors[colors[idx % colors.length]] || chartColors.blue}
              fillOpacity={0.3}
              stackId={type === "stacked" || type === "percent" ? "stack" : undefined}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DefaultTooltipContent({ valueFormatter, active, payload, label }: TooltipProps & { valueFormatter: (value: number) => string }) {
  if (!active || !payload) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium" style={{ color: entry.color }}>
            {entry.name}:
          </span>{" "}
          {valueFormatter(entry.value)}
        </p>
      ))}
    </div>
  );
}
