"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, Select, Table, Button, Row, Col } from "antd";

const { Option } = Select;

/* ✅ SAME axios config — DO NOT CHANGE */
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

export default function ZabbixTopProblemsPage() {
  const [hostGroups, setHostGroups] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [groupids, setGroupids] = useState<string[]>([]);
  const [hostids, setHostids] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
  const loadHosts = async (groups: string[]) => {
    setGroupids(groups);
    setHosts([]);
    setHostids([]);
    setTableData([]);

    if (!groups.length) return;

    const r = await axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "name"],
          groupids: groups,
        },
        id: 2,
      },
      axiosCfg
    );

    setHosts(r.data.result ?? []);
  };

  /* ---------------- LOAD TOP PROBLEMS ---------------- */
const loadProblems = async () => {
  setLoading(true);

  try {
    // 1️⃣ Get problems (NO selectHosts)
    const r = await axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "problem.get",
        params: {
          output: ["eventid", "name", "severity"],
          sortfield: "eventid",
          sortorder: "DESC",
          groupids: groupids.length ? groupids : undefined,
          hostids: hostids.length ? hostids : undefined,
        },
        id: 3,
      },
      axiosCfg
    );

    const problems = r.data.result ?? [];

    // 2️⃣ Collect hostids
    const hostIdSet = new Set<string>();
    problems.forEach((p: any) =>
      p.hostids?.forEach((h: string) => hostIdSet.add(h))
    );

    // 3️⃣ Fetch host names
    const hostsResp = await axios.post(
      "/api/zabbix-proxy",
      {
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "name"],
          hostids: Array.from(hostIdSet),
        },
        id: 4,
      },
      axiosCfg
    );

    const hostMap: Record<string, string> = {};
    (hostsResp.data.result ?? []).forEach((h: any) => {
      hostMap[h.hostid] = h.name;
    });

    // 4️⃣ Group like Zabbix UI
    const map: Record<string, any> = {};

    problems.forEach((p: any) => {
      const hostid = p.hostids?.[0];
      const host = hostMap[hostid] ?? "Unknown";
      const trigger = p.name;
      const key = `${host}||${trigger}`;

      if (!map[key]) {
        map[key] = {
          key,
          host,
          trigger,
          severity: severityText(p.severity),
          count: 0,
        };
      }
      map[key].count++;
    });

    setTableData(Object.values(map));
  } finally {
    setLoading(false);
  }
};

  /* ---------------- TABLE ---------------- */
  const columns = [
    { title: "Host", dataIndex: "host" },
    { title: "Trigger", dataIndex: "trigger" },
    { title: "Severity", dataIndex: "severity" },
    { title: "Number of problems", dataIndex: "count" },
  ];

  return (
    <Card title="Top Problems">
      {/* 🔍 FILTERS */}
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
            value={hostids}
            onChange={setHostids}
          >
            {hosts.map((h) => (
              <Option key={h.hostid} value={h.hostid}>
                {h.name}
              </Option>
            ))}
          </Select>
        </Col>

        <Col span={4}>
          <Button type="primary" onClick={loadProblems}>
            Apply
          </Button>
        </Col>
      </Row>

      {/* 📊 TABLE */}
      <Table
        style={{ marginTop: 24 }}
        bordered
        loading={loading}
        columns={columns}
        dataSource={tableData}
      />
    </Card>
  );
}

/* ---------------- SEVERITY TEXT ---------------- */
function severityText(p: number) {
  return {
    0: "Not classified",
    1: "Information",
    2: "Warning",
    3: "Average",
    4: "High",
    5: "Disaster",
  }[p];
}
