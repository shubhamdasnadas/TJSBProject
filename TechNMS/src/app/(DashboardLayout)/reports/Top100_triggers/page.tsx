"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, Select, Table, Button, Row, Col, message, Tooltip, Space } from "antd";
import { DownOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { DatePicker, Dropdown } from "antd";
import dayjs, { Dayjs } from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;

const axiosCfg = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : ""}`,
  },
};

/* =======================
   Preset definitions (same as your first snippet)
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
   Range Picker Component (embedded version)
======================= */
function RangePickerWithPresets({
  onRangeChange,
  defaultValue = [dayjs().subtract(1, "day"), dayjs()],
}: {
  onRangeChange: (range: { from: number; to: number; startDate: string; endDate: string }) => void;
  defaultValue?: [Dayjs, Dayjs];
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [dates, setDates] = useState<[Dayjs, Dayjs] | null>(defaultValue);

  useEffect(() => {
    if (defaultValue && !dates) {
      setDates(defaultValue);
      handleChange(defaultValue);
    }
  }, []);

  const handleChange = (range: [Dayjs, Dayjs] | null) => {
    if (!range) return;
    const [start, end] = range;
    setDates([start, end]);

    onRangeChange({
      from: start.unix(),
      to: end.unix(),
      startDate: start.format("YYYY-MM-DD HH:mm:ss"),
      endDate: end.format("YYYY-MM-DD HH:mm:ss"),
    });
  };

  const menuItems = [
    ...presetOptions.map((opt) => ({
      key: opt.key,
      label: opt.label,
      onClick: () => {
        if (opt.key === "maxhist") {
          message.info("Max history not implemented in this version (needs item-specific oldest time)");
          return;
        }
        const start = dayjs().subtract(opt.minutes, "minute");
        const end = dayjs();
        setDates([start, end]);
        handleChange([start, end]);
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
              if (range) {
                setDates(range as [Dayjs, Dayjs]);
                handleChange(range as [Dayjs, Dayjs]);
                setPanelVisible(false);
                setPickerOpen(false);
              }
            }}
            style={{ opacity: 0, height: 0, position: "absolute", pointerEvents: "none" }}
          />
        </div>
      ),
    },
  ];

  const displayText = dates
    ? `${dates[0].format("YYYY-MM-DD HH:mm")} → ${dates[1].format("YYYY-MM-DD HH:mm")}`
    : "Select date range";

  return (
    <Dropdown
      open={pickerOpen}
      trigger={["click"]}
      onOpenChange={setPickerOpen}
      menu={{ items: menuItems }}
    >
      <Space
        className="border rounded px-3 py-1 cursor-pointer bg-[#1f1f1f] text-gray-300 hover:bg-[#2a2a2a]"
        style={{ width: 260, justifyContent: "space-between" }}
      >
        <span>{displayText}</span>
        <Space size={4}>
          <InfoCircleOutlined style={{ color: "#888" }} />
          <DownOutlined />
        </Space>
      </Space>
    </Dropdown>
  );
}

/* =======================
   Main Component
======================= */
export default function ZabbixTopProblemsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [groupids, setGroupids] = useState<string[]>([]);
  const [hostids, setHostids] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [timeFrom, setTimeFrom] = useState<number>(Math.floor(Date.now() / 1000) - 24 * 3600);
  const [timeTill, setTimeTill] = useState<number>(Math.floor(Date.now() / 1000));

  /* Load host groups */
  useEffect(() => {
    axios
      .post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "hostgroup.get",
          params: { output: ["groupid", "name"] },
          id: 1,
        },
        axiosCfg
      )
      .then((r) => setGroups(r.data.result ?? []))
      .catch((err) => console.error("Failed to load groups", err));
  }, []);

  /* Load hosts when groups change */
  const loadHosts = async (gids: string[]) => {
    setGroupids(gids);
    setHosts([]);
    setHostids([]);
    setData([]);

    if (!gids.length) return;

    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "host.get",
          params: { output: ["hostid", "name"], groupids: gids },
          id: 2,
        },
        axiosCfg
      );
      setHosts(r.data.result ?? []);
    } catch (err) {
      console.error("Failed to load hosts", err);
    }
  };

  /* Load problems with occurrence count */
  const loadTable = async () => {
    if ((!groupids.length && !hostids.length) || timeTill <= timeFrom) {
      message.warning("Select at least one group/host and valid time range");
      return;
    }

    setLoading(true);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "event.get",
          params: {
            output: ["eventid", "name", "objectid"],
            selectHosts: ["hostid", "name"],
            selectRelatedObject: ["triggerid", "description", "priority"], // priority = severity
            groupids: groupids.length ? groupids : undefined,
            hostids: hostids.length ? hostids : undefined,
            value: 1, // PROBLEM events only
            time_from: timeFrom,
            time_till: timeTill,
            sortfield: "clock",
            sortorder: "DESC",
          },
          id: 3,
        },
        axiosCfg
      );

      const events = r.data.result ?? [];

      const map: Record<string, any> = {};

      events.forEach((e: any) => {
        const trigger = e.relatedObject || {};
        const severityNum = Number(trigger.priority ?? 0);
        const severityMap: Record<number, string> = {
          0: "Not classified",
          1: "Information",
          2: "Warning",
          3: "Average",
          4: "High",
          5: "Disaster",
        };
        const severity = severityMap[severityNum] || "Unknown";

        e.hosts?.forEach((h: any) => {
          const key = `${h.hostid}-${e.name}`;

          if (!map[key]) {
            map[key] = {
              key,
              host: h.name,
              trigger: e.name || trigger.description || "Unknown trigger",
              severity,
              count: 0,
            };
          }
          map[key].count++;
        });
      });

      // Sort by count descending
      const sorted = Object.values(map).sort((a: any, b: any) => b.count - a.count);
      setData(sorted);
    } catch (err) {
      console.error("Failed to load events", err);
      message.error("Failed to load problems");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Top Problems (Occurrence Count)">
      <Row gutter={16} align="middle">
        <Col span={6}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="Host Groups"
            style={{ width: "100%" }}
            onChange={loadHosts}
          >
            {groups.map((g) => (
              <Option key={g.groupid} value={g.groupid} label={g.name}>
                {g.name}
              </Option>
            ))}
          </Select>
        </Col>

        <Col span={6}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="Hosts"
            style={{ width: "100%" }}
            value={hostids}
            onChange={setHostids}
            disabled={!hosts.length}
          >
            {hosts.map((h) => (
              <Option key={h.hostid} value={h.hostid} label={h.name}>
                {h.name}
              </Option>
            ))}
          </Select>
        </Col>

        <Col span={6}>
          <RangePickerWithPresets
            onRangeChange={({ from, to }) => {
              setTimeFrom(from);
              setTimeTill(to);
            }}
          />
        </Col>

        <Col span={4}>
          <Button type="primary" onClick={loadTable} loading={loading}>
            Apply
          </Button>
        </Col>
      </Row>

      <Table
        style={{ marginTop: 24 }}
        bordered
        loading={loading}
        rowKey="key"
        dataSource={data}
        pagination={{ pageSize: 15 }}
        columns={[
          { title: "Host", dataIndex: "host", width: 180 },
          { title: "Trigger", dataIndex: "trigger" },
          {
            title: "Severity",
            dataIndex: "severity",
            width: 140,
            render: (text: string) => (
              <span style={{ color: getSeverityColor(text) }}>{text}</span>
            ),
          },
          {
            title: "Occurrences",
            dataIndex: "count",
            width: 140,
            sorter: (a: any, b: any) => a.count - b.count,
            defaultSortOrder: "descend",
          },
        ]}
      />
    </Card>
  );
}

/* Optional: color coding for severity */
function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    Disaster: "#d32029",
    High: "#f53d3d",
    Average: "#fa8c16",
    Warning: "#fadb14",
    Information: "#69c0ff",
    "Not classified": "#d9d9d9",
  };
  return colors[severity] || "#d9d9d9";
}