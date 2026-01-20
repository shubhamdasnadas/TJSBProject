"use client";

import React, { useState, useEffect } from "react";
import { DatePicker, Dropdown, Space, message } from "antd";
import { DownOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

/* =======================
   Preset definitions
======================= */
const presetOptions = [
  { key: "5m", label: "Last 5 minutes", minutes: 5 },
  { key: "30m", label: "Last 30 minutes", minutes: 30 },
  { key: "1h", label: "Last 1 hour", minutes: 60 },
  { key: "6h", label: "Last 6 hours", minutes: 360 },
  { key: "12h", label: "Last 12 hours", minutes: 720 },
  { key: "1d", label: "Last 24 hours", minutes: 1440 },
  { key: "3d", label: "Last 3 days", minutes: 4320 },
  { key: "7d", label: "Last 7 days", minutes: 10080 },
  { key: "30d", label: "Last 30 days", minutes: 43200 },
  { key: "90d", label: "Last 90 days (common max)", minutes: 129600 },
  { key: "180d", label: "Last 6 months", minutes: 259200 },
  { key: "365d", label: "Last 1 year", minutes: 525600 },
  {
    key: "maxhist",
    label: "Oldest available (~90–365d)",
    minutes: 525600 * 2, // fallback only, not trusted
  },
];

/* =======================
   Zabbix helper
======================= */
async function getOldestHistoryTime(itemid: string): Promise<Dayjs | null> {
  try {
    const res = await fetch("/api/zabbix-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "history.get",
        params: {
          output: ["clock"],
          history: 0,
          itemids: [itemid],
          sortfield: "clock",
          sortorder: "ASC",
          limit: 1,
        },
        id: 1,
      }),
    });

    const json = await res.json();
    const row = json?.result?.[0];
    if (!row) return null;

    return dayjs.unix(Number(row.clock));
  } catch (err) {
    console.error(err);
    return null;
  }
}

/* =======================
   Component
======================= */
export default function RangePickerDemo({
  onRangeChange,
  itemId,
}: {
  itemId?: string;
  onRangeChange: (data: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [dates, setDates] = useState<[Dayjs, Dayjs] | null>(null);

  /* Notify parent AFTER dates settle */
  useEffect(() => {
    if (!dates) return;

    onRangeChange({
      startDate: dates[0].format("YYYY-MM-DD"),
      startTime: dates[0].format("HH:mm:ss"),
      endDate: dates[1].format("YYYY-MM-DD"),
      endTime: dates[1].format("HH:mm:ss"),
    });
  }, [dates, onRangeChange]);

  const menuItems = [
    ...presetOptions.map((opt) => ({
      key: opt.key,
      label: opt.label,
      onClick: async () => {
        // REAL oldest logic
        if (opt.key === "maxhist") {
          if (!itemId) {
            message.warning("Select an item first");
            return;
          }

          const oldest = await getOldestHistoryTime(itemId);
          if (!oldest) {
            message.info("No historical data found");
            return;
          }

          setDates([oldest, dayjs()]);
          setPickerOpen(false);
          return;
        }

        // Normal presets
        setDates([dayjs().subtract(opt.minutes, "minute"), dayjs()]);
        setPickerOpen(false);
      },
    })),
    {
      key: "custom",
      label: (
        <div
          style={{ paddingTop: 6 }}
          onClick={(e) => {
            e.stopPropagation();
            setPanelVisible(true);
          }}
        >
          Custom Range
          <RangePicker
            open={panelVisible}
            value={dates}
            onOpenChange={setPanelVisible}
            onChange={(range) => {
              if (!range || !range[0] || !range[1]) return;

              setDates([range[0], range[1]]);
              setPanelVisible(false);
              setPickerOpen(false);
            }}
            style={{
              opacity: 0,
              height: 0,
              position: "absolute",
              pointerEvents: "none",
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <Dropdown
      open={pickerOpen}
      trigger={["click"]}
      onOpenChange={(open) => {
        setPickerOpen(open);
        if (!open) setPanelVisible(false);
      }}
      menu={{ items: menuItems }}
    >
      <Space
        className="border rounded px-3 py-1 cursor-pointer bg-[#1f1f1f] text-gray-300"
        style={{ width: 260, justifyContent: "space-between" }}
      >
        <span>
          {dates
            ? `${dates[0].format("YYYY-MM-DD HH:mm")} → ${dates[1].format(
                "YYYY-MM-DD HH:mm"
              )}`
            : "Start date → End date"}
        </span>
        <DownOutlined />
      </Space>
    </Dropdown>
  );
}
