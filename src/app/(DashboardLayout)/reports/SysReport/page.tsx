"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Select,
  Button,
  Table,
  Space,
  Modal,
  Input,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Card } from "@mui/material";
import RangePickerDemo from "../../RangePickerDemo";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* =========================
   TYPES
========================= */
type HostGroup = { groupid: string; name: string };
type Host = { hostid: string; name: string };

type TableRow = {
  key: string;
  itemid: string;
  host: string;
  name: string;
  lastValue: string;
  lastCheck: string;
  change: string;
  value_type?: number;
};

type DateRange = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};
 
/* =========================
   AXIOS CONFIG
========================= */
const axiosCfg = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("zabbix_auth")}`,
  },
};

/* =========================
   SEVERITY COLOR
========================= */
const severityColor = (s?: number) => {
  if (s === undefined) return "red";
  if (s >= 4) return "#d32f2f"; // High / Disaster
  if (s === 3) return "#f57c00"; // Average
  return "#fbc02d"; // Warning
};

/* =========================
   HISTORY CHART
========================= */
const HistoryLineChart = ({ data }: { data: any[] }) => {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    time: Number(d.clock) * 1000,
    value: Number(d.value),
    isTrigger: d.isTrigger,
    triggerName: d.triggerName,
    severity: d.severity,
  }));

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <XAxis
            dataKey="time"
            type="number"
            domain={["auto", "auto"]}
            tickFormatter={(v) =>
              new Date(v).toLocaleTimeString()
            }
          />
          <YAxis />
          <Tooltip
            labelFormatter={(v) =>
              new Date(Number(v)).toLocaleString()
            }
            content={({ payload }) => {
              if (!payload?.length) return null;
              const p = payload[0].payload;
              return (
                <div style={{ background: "#fff", padding: 8 }}>
                  <div>Time: {new Date(p.time).toLocaleString()}</div>
                  <div>Value: {p.value}</div>
                  {p.isTrigger && (
                    <>
                      <div style={{ color: severityColor(p.severity) }}>
                        Trigger: {p.triggerName}
                      </div>
                      <div>Severity: {p.severity}</div>
                    </>
                  )}
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            strokeWidth={2}
            dot={(props: any) => {
              if (!props.payload?.isTrigger) return null;
              return (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={severityColor(props.payload?.severity)}
                />
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/* =========================
   PAGE
========================= */
export default function SysReportPage() {
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);

  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [filteredData, setFilteredData] = useState<TableRow[]>([]);
  const [searchText, setSearchText] = useState("");

  const [loadingTable, setLoadingTable] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyHost, setHistoryHost] = useState("");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyDateRange, setHistoryDateRange] =
    useState<DateRange>({
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
    });

  /* LOAD HOST GROUPS */
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
      .then((r) => setHostGroups(r.data.result ?? []));
  }, []);

  const loadHosts = async (groups: string[]) => {
    if (!groups.length) return setHosts([]);
    const r = await axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "host.get",
        params: { output: ["hostid", "name"], groupids: groups },
        id: 2,
      },
      axiosCfg
    );
    setHosts(r.data.result ?? []);
  };

  /* APPLY */
  const handleApply = async () => {
    if (!selectedHosts.length)
      return message.warning("Select host");

    setLoadingTable(true);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "item.get",
          params: {
            output: [
              "itemid",
              "name",
              "lastvalue",
              "lastclock",
              "delta",
              "value_type",
            ],
            selectHosts: ["name"],
            hostids: selectedHosts,
          },
          id: 3,
        },
        axiosCfg
      );

      const items = r.data.result.map((i: any) => ({
        key: i.itemid,
        itemid: i.itemid,
        host: i.hosts?.[0]?.name ?? "-",
        name: i.name,
        lastValue: i.lastvalue,
        lastCheck: new Date(
          i.lastclock * 1000
        ).toLocaleString(),
        change: i.delta ?? "-",
        value_type: i.value_type,
      }));

      setTableData(items);
      setFilteredData(items);
    } finally {
      setLoadingTable(false);
    }
  };

  /* SEARCH */
  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilteredData(
      tableData.filter((i) =>
        i.name.toLowerCase().includes(value.toLowerCase())
      )
    );
  };

  /* =========================
     OPEN HISTORY
  ========================= */
  const openHistory = async (
    itemid: string,
    name: string,
    host: string,
    valueType?: number
  ) => {
    try {
      setHistoryTitle(name);
      setHistoryHost(host);
      setHistoryLoading(true);
      setHistoryOpen(true);

      /* 1️⃣ HISTORY */
      const historyRes = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "history.get",
          params: {
            output: "extend",
            history: valueType ?? 0,
            itemids: [itemid],
            sortfield: "clock",
            sortorder: "ASC",
          },
          id: 1,
        },
        axiosCfg
      );

      const historyPoints = (historyRes.data.result ?? []).map(
        (h: any) => ({
          clock: Number(h.clock),
          value: Number(h.value),
          isTrigger: false,
        })
      );

      if (!historyPoints.length) {
        message.warning("No history data");
        return;
      }

      /* 2️⃣ TRIGGERS (ITEM-SCOPED) */
      const triggerRes = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "trigger.get",
          params: {
            output: ["triggerid", "description", "priority"],
            selectFunctions: [itemid],
            filter: { status: 0 },
          },
          id: 2,
        },
        axiosCfg
      );

      const triggers = triggerRes.data.result ?? [];
      const triggerIds = triggers.map((t: any) => t.triggerid);

      if (!triggerIds.length) {
        setHistoryData(historyPoints);
        return;
      }

      /* 3️⃣ EVENTS */
      const eventRes = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "event.get",
          params: {
            output: ["eventid", "clock", "objectid"],
            object: 0,
            objectids: triggerIds,
            value: 1,
          },
          id: 3,
        },
        axiosCfg
      );

      const events = eventRes.data.result ?? [];

      /* 4️⃣ MATCH */
      const MATCH_WINDOW = 120;

      events.forEach((ev: any) => {
        let closestIdx = -1;
        let bestDiff = MATCH_WINDOW + 1;

        historyPoints.forEach((p: any, idx: number) => {
          const diff = Math.abs(p.clock - Number(ev.clock));
          if (diff <= MATCH_WINDOW && diff < bestDiff) {
            bestDiff = diff;
            closestIdx = idx;
          }
        });

        if (closestIdx !== -1) {
          const trig = triggers.find(
            (t: any) => t.triggerid === ev.objectid
          );

          historyPoints[closestIdx] = {
            ...historyPoints[closestIdx],
            isTrigger: true,
            triggerName: trig?.description,
            severity: trig?.priority,
          };
        }
      });

      setHistoryData(historyPoints);
    } catch (e) {
      console.error(e);
      message.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterHistory = () => {
    if (!historyDateRange.startDate) return historyData;

    const start =
      new Date(
        `${historyDateRange.startDate} ${
          historyDateRange.startTime || "00:00:00"
        }`
      ).getTime() / 1000;

    const end =
      new Date(
        `${historyDateRange.endDate} ${
          historyDateRange.endTime || "23:59:59"
        }`
      ).getTime() / 1000;

    return historyData.filter(
      (r: any) => r.clock >= start && r.clock <= end
    );
  };

  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 180 },
    { title: "Item", dataIndex: "name", width: 350 },
    { title: "Last Value", dataIndex: "lastValue", width: 120 },
    { title: "Last Check", dataIndex: "lastCheck", width: 180 },
    { title: "Change", dataIndex: "change", width: 100 },
    {
      title: "History",
      render: (_, r) => (
        <Button
          size="small"
          onClick={() =>
            openHistory(r.itemid, r.name, r.host, r.value_type)
          }
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Card style={{ padding: 35 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space>
          <Select
            mode="multiple"
            placeholder="Host Groups"
            style={{ width: 260 }}
            options={hostGroups.map((g) => ({
              label: g.name,
              value: g.groupid,
            }))}
            onChange={(g) => {
              setSelectedGroups(g);
              setSelectedHosts([]);
              loadHosts(g);
            }}
          />

          <Select
            mode="multiple"
            placeholder="Hosts"
            style={{ width: 260 }}
            options={hosts.map((h) => ({
              label: h.name,
              value: h.hostid,
            }))}
            onChange={setSelectedHosts}
          />

          <Button type="primary" onClick={handleApply}>
            Apply
          </Button>
        </Space>

        <Input.Search
          placeholder="Search item name"
          allowClear
          value={searchText}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 400 }}
        />

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loadingTable}
        />

        <Modal
          title={`${historyHost} – ${historyTitle}`}
          open={historyOpen}
          onCancel={() => setHistoryOpen(false)}
          footer={null}
          width={900}
        >
          <RangePickerDemo onRangeChange={setHistoryDateRange} />
          <HistoryLineChart data={filterHistory()} />
        </Modal>
      </Space>
    </Card>
  );
}
