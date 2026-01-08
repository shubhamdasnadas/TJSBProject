"use client";

import React, { useState, useEffect } from "react";
import { DatePicker, Dropdown, Space } from "antd";
import { DownOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;

const presetOptions = [
  { key: "5m", label: "Last 5 minutes", minutes: 5 },
  { key: "15m", label: "Last 15 minutes", minutes: 15 },
  { key: "30m", label: "Last 30 minutes", minutes: 30 },
  { key: "1h", label: "Last 1 hour", minutes: 60 },
  { key: "3h", label: "Last 3 hours", minutes: 180 },
  { key: "6h", label: "Last 6 hours", minutes: 360 },
  { key: "12h", label: "Last 12 hours", minutes: 720 },
  { key: "1d", label: "Last 1 day", minutes: 1440 },
  { key: "365d", label: "Last 1 year", minutes: 525600 },
];

export default function RangePickerDemo({
  onRangeChange,
}: {
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

  /* 🔁 Notify parent AFTER dates are finalized */
  useEffect(() => {
    if (!dates) return;

    onRangeChange({
      startDate: dates[0].format("YYYY-MM-DD"),
      startTime: dates[0].format("HH:mm:ss"),
      endDate: dates[1].format("YYYY-MM-DD"),
      endTime: dates[1].format("HH:mm:ss"),
    });
  }, [dates]);

  const menuItems = [
    ...presetOptions.map((opt) => ({
      key: opt.key,
      label: opt.label,
      onClick: () => {
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

              // ✅ SAVE FIRST
              setDates([range[0], range[1]]);

              // ✅ THEN CLOSE EVERYTHING
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
