"use client";

import React, { useState } from "react";
import { DatePicker, Dropdown, Space, message, Tooltip } from "antd";
import { DownOutlined, InfoCircleOutlined } from "@ant-design/icons";
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
  { key: "90d", label: "Last 90 days", minutes: 129600 },
  { key: "180d", label: "Last 6 months", minutes: 259200 },
  { key: "365d", label: "Last 1 year", minutes: 525600 },
  {
    key: "maxhist",
    label: "Oldest available (~90–365d)",
    minutes: 525600 * 2, // fallback only
  },
];

/* =======================
   Zabbix helper – get oldest timestamp
======================= */
async function getOldestHistoryTime(itemid: string): Promise<Dayjs | null> {
  try {
    const res = await fetch("/api/zabbix-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("zabbix_auth") || ""}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "history.get",
        params: {
          output: ["clock"],
          history: 0, // numeric float/int
          itemids: [itemid],
          sortfield: "clock",
          sortorder: "ASC",
          limit: 1,
        },
        id: 1,
      }),
    });

    const json = await res.json();
    if (!json.result?.length) return null;

    const clock = Number(json.result[0].clock);
    return dayjs.unix(clock);
  } catch (err) {
    console.error("Failed to fetch oldest timestamp:", err);
    return null;
  }
}

/* =======================
   Component
======================= */
export default function RangePickerDemo2({
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
  const [oldestDate, setOldestDate] = useState<Dayjs | null>(null);
  const [loadingOldest, setLoadingOldest] = useState(false);

  // Fetch oldest timestamp when itemId changes
  React.useEffect(() => {
    if (!itemId) {
      setOldestDate(null);
      return;
    }

    let mounted = true;
    setLoadingOldest(true);

    getOldestHistoryTime(itemId).then((oldest) => {
      if (mounted) {
        setOldestDate(oldest);
        setLoadingOldest(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [itemId]);

  const menuItems = [
    ...presetOptions.map((opt) => ({
      key: opt.key,
      label: opt.label,
      onClick: async () => {
        if (opt.key === "maxhist") {
          if (!itemId) {
            message.warning("No item selected");
            return;
          }

          if (loadingOldest) {
            message.loading("Fetching oldest timestamp...", 1.5);
            return;
          }

          if (!oldestDate) {
            message.info("No historical data available for this item");
            return;
          }

          const endDate = dayjs();
          setDates([oldestDate, endDate]);

          onRangeChange({
            startDate: oldestDate.format("YYYY-MM-DD"),
            startTime: oldestDate.format("HH:mm:ss"),
            endDate: endDate.format("YYYY-MM-DD"),
            endTime: endDate.format("HH:mm:ss"),
          });

          

          setPickerOpen(false);
          return;
        }

        // Normal presets
        const startDate = dayjs().subtract(opt.minutes, "minute");
        const endDate = dayjs();
        setDates([startDate, endDate]);

        onRangeChange({
          startDate: startDate.format("YYYY-MM-DD"),
          startTime: startDate.format("HH:mm:ss"),
          endDate: endDate.format("YYYY-MM-DD"),
          endTime: endDate.format("HH:mm:ss"),
        });

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
              onRangeChange({
                startDate: range[0].format("YYYY-MM-DD"),
                startTime: range[0].format("HH:mm:ss"),
                endDate: range[1].format("YYYY-MM-DD"),
                endTime: range[1].format("HH:mm:ss"),
              });
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

  const displayText = dates
    ? `${dates[0].format("YYYY-MM-DD HH:mm")} → ${dates[1].format("YYYY-MM-DD HH:mm")}`
    : "Select date range";

  return (
    <Tooltip
      title={
        loadingOldest
          ? "Fetching oldest available date..."
          : oldestDate
          ? `Oldest available: ${oldestDate.format("YYYY-MM-DD")}`
          : "No oldest date fetched yet"
      }
    >
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
          className="border rounded px-3 py-1 cursor-pointer bg-[#1f1f1f] text-gray-300 hover:bg-[#2a2a2a]"
          style={{ width: 260, justifyContent: "space-between" }}
        >
          <span>{displayText}</span>
          <Space size={4}>
            {loadingOldest && <span style={{ color: "#faad14" }}>Loading...</span>}
            <InfoCircleOutlined style={{ color: "#888" }} />
            <DownOutlined />
          </Space>
        </Space>
      </Dropdown>
    </Tooltip>
  );
}