"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, Select, Table, Button, Row, Col } from "antd";

const { Option } = Select;

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
  const [groups, setGroups] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [groupids, setGroupids] = useState<string[]>([]);
  const [hostids, setHostids] = useState<string[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* Load groups */
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
      .then((r) => setGroups(r.data.result ?? []));
  }, []);

  /* Load hosts */
  const loadHosts = async (gids: string[]) => {
    setGroupids(gids);
    setHosts([]);
    setHostids([]);
    setData([]);

    if (!gids.length) return;

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
  };

  /* 🔥 Load table WITH OCCURRENCE COUNT */
  const loadTable = async () => {
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const time_from = now - 24 * 3600; // last 6 hours (same as working page)

      const r = await axios.post(
        "/api/zabbix-proxy",
        {
          jsonrpc: "2.0",
          method: "event.get",
          params: {
            output: ["eventid", "name"],
            selectHosts: ["hostid", "name"],
            groupids,
            hostids,
            value: 1, // PROBLEM only
            time_from,
            time_till: now,
          },
          id: 3,
        },
        axiosCfg
      );

      const events = r.data.result ?? [];

      /* ✅ SAME OCCURRENCE LOGIC */
      const map: Record<string, any> = {};

      events.forEach((e: any) => {
        e.hosts.forEach((h: any) => {
          const key = `${h.hostid}-${e.name}`;

          if (!map[key]) {
            map[key] = {
              key,
              host: h.name,
              trigger: e.name,
              severity: "N/A", // optional
              count: 0,
            };
          }

          map[key].count++;
        });
      });

      setData(Object.values(map));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Top Problems (Occurrence Count)">
      <Row gutter={16}>
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

        <Col span={10}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="Hosts"
            style={{ width: "100%" }}
            value={hostids}
            onChange={setHostids}
          >
            {hosts.map((h) => (
              <Option key={h.hostid} value={h.hostid} label={h.name}>
                {h.name}
              </Option>
            ))}
          </Select>
        </Col>

        <Col span={4}>
          <Button type="primary" onClick={loadTable}>
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
        columns={[
          { title: "Host", dataIndex: "host" },
          { title: "Trigger", dataIndex: "trigger" },
          { title: "Severity", dataIndex: "severity" },
          {
            title: "Number of problems",
            dataIndex: "count",
            sorter: (a, b) => a.count - b.count,
          },
        ]}
      />
    </Card>
  );
}






