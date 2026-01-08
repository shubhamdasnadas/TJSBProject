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

  /* ✅ PAGINATION STATE */
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  /* =========================
     KEYBOARD PAGINATION
     Alt + N / Alt + P
  ========================= */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ignore while typing
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const totalPages = Math.ceil(data.length / pageSize);

      // Alt + N → Next
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCurrentPage((p) => (p < totalPages ? p + 1 : p));
      }

      // Alt + P → Previous
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setCurrentPage((p) => (p > 1 ? p - 1 : p));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data.length]);

  /* =========================
     LOAD GROUPS
  ========================= */
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

  /* =========================
     LOAD HOSTS
  ========================= */
  const loadHosts = async (gids: string[]) => {
    setGroupids(gids);
    setHosts([]);
    setHostids([]);
    setData([]);
    setCurrentPage(1);

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

  /* =========================
     LOAD TABLE (WITH COUNT)
  ========================= */
  const loadTable = async () => {
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const time_from = now - 24 * 3600;

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
            value: 1,
            time_from,
            time_till: now,
          },
          id: 3,
        },
        axiosCfg
      );

      const events = r.data.result ?? [];
      const map: Record<string, any> = {};

      events.forEach((e: any) => {
        e.hosts.forEach((h: any) => {
          const key = `${h.hostid}-${e.name}`;

          if (!map[key]) {
            map[key] = {
              key,
              host: h.name,
              trigger: e.name,
              severity: "N/A",
              count: 0,
            };
          }

          map[key].count++;
        });
      });

      setData(Object.values(map));
      setCurrentPage(1); // ✅ reset page
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title={
        <span>
          Top Problems (Occurrence Count)
          <span style={{ marginLeft: 12, color: "#999", fontSize: 12 }}>
            (Alt + N / Alt + P)
          </span>
        </span>
      }
    >
      <Row gutter={16}>
        <Col span={6}>
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            placeholder="Host Groups"
            style={{ width: "100%" }}
            listHeight={600}
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
            listHeight={600}
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
        pagination={{
          current: currentPage,
          pageSize,
          total: data.length,
          onChange: setCurrentPage,
          showSizeChanger: false,
        }}
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
