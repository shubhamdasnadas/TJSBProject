"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  Select,
  Table,
  Button,
  Space,
  Row,
  Col,
  Modal,
  Spin,
} from "antd";

const { Option } = Select;

/* axios config – SAME AS YOUR WORKING CODE */
const axiosCfg = {
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${
      typeof window !== "undefined"
        ? localStorage.getItem("zabbix_auth")
        : ""
    }`,
  },
};

export default function ZabbixItemsPage() {
  const [hostGroups, setHostGroups] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyTitle, setHistoryTitle] = useState("");
  const [historyHost, setHistoryHost] = useState("");

  /* ---------------- LOAD HOST GROUPS ---------------- */
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

  /* ---------------- LOAD HOSTS ---------------- */
  const loadHosts = async (groupids: string[]) => {
    setHosts([]);
    setSelectedHosts([]);
    setTableData([]);

    if (!groupids.length) return;

    const r = await axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "name"],
          groupids,
        },
        id: 2,
      },
      axiosCfg
    );

    setHosts(r.data.result ?? []);
  };

  /* ---------------- LOAD ITEMS (TABLE) ---------------- */
  const loadItems = async () => {
    if (!selectedHosts.length) return;

    setLoadingTable(true);
    try {
      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "item.get",
          params: {
            output: ["itemid", "name", "lastvalue", "lastclock", "delta"],
            selectHosts: ["name"],
            hostids: selectedHosts,
          },
          id: 3,
        },
        axiosCfg
      );

      setTableData(
        (r.data.result ?? []).map((i: any) => ({
          key: i.itemid,
          itemid: i.itemid,
          host: i.hosts?.[0]?.name ?? "-",
          name: i.name,
          lastValue: i.lastvalue,
          lastCheck: new Date(i.lastclock * 1000).toLocaleString(),
          change: i.delta ?? "-",
        }))
      );
    } finally {
      setLoadingTable(false);
    }
  };

  /* ---------------- OPEN HISTORY ---------------- */
  const openHistory = async (itemid: string, name: string, host: string) => {
    setHistoryTitle(name);
    setHistoryHost(host);
    setHistoryOpen(true);
    setHistoryLoading(true);

    const r = await axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "history.get",
        params: {
          output: "extend",
          history: 0,
          itemids: [itemid],
          sortfield: "clock",
          sortorder: "DESC",
          limit: 1000,
        },
        id: 10,
      },
      axiosCfg
    );

    setHistoryData(r.data.result ?? []);
    setHistoryLoading(false);
  };

  /* ---------------- TABLE COLUMNS ---------------- */
  const columns = [
    { title: "Host", dataIndex: "host" },
    { title: "Item", dataIndex: "name" },
    { title: "Last value", dataIndex: "lastValue" },
    { title: "Last check", dataIndex: "lastCheck" },
    { title: "Change", dataIndex: "change" },
    {
      title: "History",
      render: (_: any, r: any) => (
        <Button
          size="small"
          onClick={() => openHistory(r.itemid, r.name, r.host)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <Card title="Zabbix Items">
      <Row gutter={16}>
        <Col span={6}>
          <Select
            mode="multiple"
            placeholder="Host Groups"
            style={{ width: "100%" }}
            onChange={loadHosts}
          >
            {hostGroups.map((g) => (
              <Option key={g.groupid} value={g.groupid}>
                {g.name}
              </Option>
            ))}
          </Select>
        </Col>

        <Col span={10}>
          <Select
            mode="multiple"
            placeholder="Hosts"
            style={{ width: "100%" }}
            value={selectedHosts}
            onChange={setSelectedHosts}
          >
            {hosts.map((h) => (
              <Option key={h.hostid} value={h.hostid}>
                {h.name}
              </Option>
            ))}
          </Select>
        </Col>

        <Col span={4}>
          <Button type="primary" onClick={loadItems}>
            Load Items
          </Button>
        </Col>
      </Row>

      <Table
        style={{ marginTop: 24 }}
        loading={loadingTable}
        columns={columns}
        dataSource={tableData}
        bordered
      />

      <Modal
        open={historyOpen}
        title={`${historyHost} – ${historyTitle}`}
        onCancel={() => setHistoryOpen(false)}
        footer={null}
        width={800}
      >
        {historyLoading ? (
          <Spin />
        ) : (
          <pre style={{ maxHeight: 400, overflow: "auto" }}>
            {JSON.stringify(historyData, null, 2)}
          </pre>
        )}
      </Modal>
    </Card>
  );
}
