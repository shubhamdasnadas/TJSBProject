"use client";

import { useState, useEffect } from "react";
import { Card, Select, Button, Table, Space, Input, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import axios from "axios";
import HistoryModal from "../SysReport/HistoryModal";
import RangePickerDemo2 from "../../RangePickerDemo2"; // if still needed somewhere

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

const getAxiosConfig = () => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("zabbix_auth") || ""}`,
  },
});

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
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyHost, setHistoryHost] = useState("");
  const [currentHistoryItem, setCurrentHistoryItem] = useState<{
    itemid: string;
    name: string;
    host: string;
    valueType?: number;
  } | null>(null);

  useEffect(() => {
    axios
      .post(
        "/api/zabbix-proxy",
        { jsonrpc: "2.0", method: "hostgroup.get", params: { output: ["groupid", "name"] }, id: 1 },
        getAxiosConfig()
      )
      .then((r) => setHostGroups(r.data.result ?? []))
      .catch(() => message.error("Failed to load host groups"));
  }, []);

  const loadHosts = async (groups: string[]) => {
    if (!groups.length) return setHosts([]);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        { jsonrpc: "2.0", method: "host.get", params: { output: ["hostid", "name"], groupids: groups }, id: 2 },
        getAxiosConfig()
      );
      setHosts(r.data.result ?? []);
    } catch {
      message.error("Failed to load hosts");
    }
  };

  const handleApply = async () => {
    if (!selectedHosts.length) return message.warning("Select at least one host");

    setLoadingTable(true);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "item.get",
          params: {
            output: ["itemid", "name", "lastvalue", "lastclock", "delta", "value_type"],
            selectHosts: ["name"],
            hostids: selectedHosts,
          },
          id: 3,
        },
        getAxiosConfig()
      );

      const items = (r.data.result || []).map((i: any) => ({
        key: i.itemid,
        itemid: i.itemid,
        host: i.hosts?.[0]?.name ?? "-",
        name: i.name,
        lastValue: i.lastvalue ?? "—",
        lastCheck: i.lastclock ? new Date(i.lastclock * 1000).toLocaleString() : "—",
        change: i.delta ?? "—",
        value_type: i.value_type,
      }));

      setTableData(items);
      setFilteredData(items);
      message.success(`Loaded ${items.length} items`);
    } catch (err) {
      message.error("Failed to fetch items");
    } finally {
      setLoadingTable(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setFilteredData(tableData.filter((i) => i.name.toLowerCase().includes(value.toLowerCase())));
  };

  const columns: ColumnsType<TableRow> = [
    { title: "Host", dataIndex: "host", width: 180 },
    { title: "Item", dataIndex: "name", width: 350 },
    { title: "Last Value", dataIndex: "lastValue", width: 120 },
    { title: "Last Check", dataIndex: "lastCheck", width: 180 },
    { title: "Change", dataIndex: "change", width: 100 },
    {
      title: "History",
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setHistoryTitle(record.name);
            setHistoryHost(record.host);
            setCurrentHistoryItem({
              itemid: record.itemid,
              name: record.name,
              host: record.host,
              valueType: record.value_type,
            });
            setHistoryOpen(true);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Card style={{ padding: 35 }}>
      <Space direction="vertical" style={{ width: "100%" }}>
        <Space wrap>
          <Select
            mode="multiple"
            placeholder="Host Groups"
            style={{ width: 260 }}
            options={hostGroups.map((g) => ({ label: g.name, value: g.groupid }))}
            onChange={(g) => {
              setSelectedGroups(g);
              setSelectedHosts([]);
              loadHosts(g);
            }}
            value={selectedGroups}
          />
          <Select
            mode="multiple"
            placeholder="Hosts"
            style={{ width: 260 }}
            options={hosts.map((h) => ({ label: h.name, value: h.hostid }))}
            onChange={setSelectedHosts}
            value={selectedHosts}
          />
          <Button type="primary" onClick={handleApply} loading={loadingTable}>
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
          pagination={{ pageSize: 20 }}
          scroll={{ x: "max-content" }}
        />
      </Space>

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={historyTitle}
        host={historyHost}
        item={currentHistoryItem}
      />
    </Card>
  );
}