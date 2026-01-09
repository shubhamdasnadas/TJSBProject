
"use client";

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import {
  Button,
  Form,
  Input,
  Radio,
  Select,
  Row,
  Col,
  Space,
  Checkbox,
  Table,
  message,
} from 'antd';
import axios from 'axios';
import type { FormProps } from 'antd';
import LatestDataTable from './aaj';

type SizeType = Parameters<typeof Form>[0]['size'];

type HostGroup = {
  groupid: string;
  name: string;
};

export default function LatestDataPage() {
  const [componentSize, setComponentSize] = useState<SizeType | 'default'>('small');
  const [form] = Form.useForm();
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [hosts, setHosts] = useState<any[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [value, setValue] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const user_token =
    typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : null;
  const onFormLayoutChange: FormProps<any>['onValuesChange'] = ({ size }) => {
    setComponentSize(size);
  };

  // Fetch host groups on mount
  const handleGetHostGroups = async () => {
    setLoadingGroups(true);

    const payload = {
      jsonrpc: '2.0',
      method: 'hostgroup.get',
      params: {
        output: ['groupid', 'name'],
      },
      auth: user_token,
      id: 1,
    };

    try {
      const response = await axios.post('/api/zabbix-proxy', payload, {
        headers: { 'Content-Type': 'application/json', },
      });

      const items = response?.data?.result ?? [];
      const normalized = Array.isArray(items)
        ? items.map((g: any) => ({ groupid: String(g.groupid), name: g.name }))
        : [];

      setHostGroups(normalized);
    } catch (err: any) {
      console.error('Hostgroup fetch error', err);
      if (err?.response) {
        console.error('Hostgroup fetch - response status:', err.response.status);
        console.error('Hostgroup fetch - response data:', err.response.data);
      }
      setHostGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch hosts for selected group IDs
  const handleGetHosts = async (groupIds: string[]) => {
    if (!groupIds?.length) {
      setHosts([]);
      return;
    }

    setLoadingHosts(true);

    const payload = {
      jsonrpc: '2.0',
      method: 'host.get',
      params: {
        output: ['hostid', 'name'],
        groupids: groupIds,
      },
      auth: user_token,
      id: 2,
    };

    try {
      const res = await axios.post('/api/zabbix-proxy', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      setHosts(res?.data?.result ?? []);
    } catch (err: any) {
      console.error('Host fetch error', err);
      setHosts([]);
    } finally {
      setLoadingHosts(false);
    }
  };

  // Auto-fetch host groups on mount
  useEffect(() => {
    handleGetHostGroups();
  }, []);

  // Auto-fetch hosts when selected group IDs change
  useEffect(() => {
    handleGetHosts(value);
  }, [value]);

  // Auto-fetch hosts when selected group IDs change
  useEffect(() => {
    handleGetHosts(value);
  }, [value]);

  // Fetch table data when Apply is pressed or on mount
  const handleApply = async () => {
    setLoadingTable(true);

    const params: any = {
      output: ['itemid', 'name', 'lastvalue', 'lastclock', 'delta', 'prevvalue', 'type'],
      selectHosts: ['hostid', 'name'],
      selectTags: ['tag', 'value'],
    };

    // When hosts are selected, limit to those; otherwise fetch all
    if (selectedHosts?.length) {
      params.hostids = selectedHosts;
    }

    const payload = {
      jsonrpc: '2.0',
      method: 'item.get',
      params,
      auth: user_token,
      id: 3,
    };

    try {
      const res = await axios.post('/api/zabbix-proxy', payload, {
        headers: { 'Content-Type': 'application/json', },
      });

      const items = res?.data?.result ?? [];
      console.log('Apply result count:', Array.isArray(items) ? items.length : 'non-array', items);

      if (!Array.isArray(items) || items.length === 0) {
        message.info('No items returned for the current filter.');
      }

      const formatted = Array.isArray(items)
        ? items.map((item: any) => ({
          key: String(item.itemid ?? JSON.stringify(item)),
          host: item.hosts?.[0]?.name ?? item.hosts?.[0]?.hostid ?? 'Unknown',
          name: item.name ?? '',
          lastValue: item.lastvalue ?? '',
          lastCheck: item.lastclock ? new Date(Number(item.lastclock) * 1000).toLocaleString() : '-',
          change: item.delta ? String(item.delta) : '-',
          tags: Array.isArray(item.tags)
            ? item.tags.map((t: any) => `${t.tag}:${t.value}`).join(', ')
            : '-',
          info: '-',
        }))
        : [];

      setTableData(formatted);
    } catch (err: any) {
      console.error('Table fetch failed', err);
      if (err?.response) {
        console.error('item.get - response status:', err.response.status);
        console.error('item.get - response data:', err.response.data);
        message.error(`item.get failed: HTTP ${err.response.status}`);
      } else if (err?.request) {
        console.error('item.get - no response received');
        message.error('item.get failed: no response from server');
      } else {
        console.error('item.get - error:', err?.message);
        message.error('item.get failed: see console');
      }
      setTableData([]);
    } finally {
      setLoadingTable(false);
    }
  };

  // Load all items on initial mount
  useEffect(() => {
    handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [tags, setTags] = useState([
    { tag: "", operator: "contains", value: "" }
  ]);

  // ADD NEW TAG ROW
  const handleAddTag = () => {
    setTags([...tags, { tag: "", operator: "contains", value: "" }]);
  };

  // REMOVE TAG ROW
  const handleRemoveTag = (index: number) => {
    const updated = [...tags];
    updated.splice(index, 1);
    setTags(updated);
  };
  const MAX_COUNT = 3;
  const suffix = <span style={{ color: '#8c8c8c' }}>▾</span>;

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ size: "small" }}
        size="small"
        style={{
          background: "#ffffff",
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid #e6e6e6",
        }}
      >

        {/* ---------------------- ROW 1 ---------------------- */}
        <Row gutter={[24, 16]}>
          <Col span={8}>
            <Form.Item label="Name">
              <Input placeholder="Enter name" size="middle" style={{ width: "100%" }} />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Host groups">
              <Select
                mode="multiple"
                maxCount={MAX_COUNT}
                value={value}
                loading={loadingGroups}
                style={{ width: '100%' }}
                onChange={setValue}
                suffixIcon={suffix}
                placeholder="Please select"
                size="middle"
                options={hostGroups.map(g => ({ value: g.groupid, label: g.name }))}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Hosts">
              <Select
                mode="multiple"
                maxCount={MAX_COUNT}
                value={selectedHosts}
                loading={loadingHosts}
                style={{ width: '100%' }}
                onChange={setSelectedHosts}
                suffixIcon={suffix}
                placeholder="Please select"
                size="middle"
                options={hosts.map(h => ({ value: h.hostid, label: h.name }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* BREAK LINE */}
        <div style={{ borderBottom: "1px solid #eee", margin: "20px 0" }} />

        {/* ---------------------- ROW 2 ---------------------- */}
        {/* <Row gutter={[24, 16]}>
          <Col span={6}>
            <Form.Item label="Show tags">
              <Radio.Group defaultValue="3" size="middle">
                <Radio.Button value="none">None</Radio.Button>
                <Radio.Button value="1">1</Radio.Button>
                <Radio.Button value="2">2</Radio.Button>
                <Radio.Button value="3">3</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item label="Tag name">
              <Radio.Group defaultValue="full" size="middle">
                <Radio.Button value="full">Full</Radio.Button>
                <Radio.Button value="short">Short</Radio.Button>
                <Radio.Button value="none">None</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item label="Tag display priority">
              <Input placeholder="comma-separated list" size="middle" />
            </Form.Item>
          </Col>

          <Col span={6}>
            <Form.Item label="State">
              <Radio.Group defaultValue="all" size="middle">
                <Radio.Button value="all">All</Radio.Button>
                <Radio.Button value="normal">Normal</Radio.Button>
                <Radio.Button value="not_supported">Not supported</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row> */}

        {/* BREAK LINE */}
        {/* <div style={{ borderBottom: "1px solid #eee", margin: "20px 0" }} /> */}

        {/* ---------------------- ROW 3 — TAGS (Dynamic) ---------------------- */}
        {/* <Row gutter={[24, 16]}>
          <Col span={24}>
            <Form.Item label="Tags">

              <Space direction="vertical" size={12} style={{ width: "100%" }}>

                {tags.map((item, index) => (
                  <Row key={index} gutter={16} align="middle">

                    TAG INPUT
                    <Col span={6}>
                      <Input
                        placeholder="tag"
                        size="middle"
                        value={item.tag}
                        onChange={(e) => {
                          const updated = [...tags];
                          updated[index].tag = e.target.value;
                          setTags(updated);
                        }}
                        style={{ borderRadius: 6 }}
                      />
                    </Col>

                    OPERATOR SELECT
                    <Col span={6}>
                      <Select
                        value={item.operator}
                        size="middle"
                        style={{ width: "100%", borderRadius: 6 }}
                        onChange={(value) => {
                          const updated = [...tags];
                          updated[index].operator = value;
                          setTags(updated);
                        }}
                      >
                        <Select.Option value="contains">Contains</Select.Option>
                        <Select.Option value="equals">Equals</Select.Option>
                        <Select.Option value="exists">Exists</Select.Option>
                        <Select.Option value="not_contains">Not contains</Select.Option>
                        <Select.Option value="not_exists">Not exists</Select.Option>
                        <Select.Option value="not_equals">Not equals</Select.Option>
                      </Select>
                    </Col>

                    VALUE INPUT
                    <Col span={6}>
                      <Input
                        placeholder="value"
                        size="middle"
                        value={item.value}
                        onChange={(e) => {
                          const updated = [...tags];
                          updated[index].value = e.target.value;
                          setTags(updated);
                        }}
                        style={{ borderRadius: 6 }}
                      />
                    </Col>

                    REMOVE BUTTON
                    <Col span={6}>
                      <Button
                        danger
                        size="middle"
                        onClick={() => handleRemoveTag(index)}
                        style={{
                          borderRadius: 6,
                          borderColor: "#ff4d4f",
                          padding: "0 18px",
                        }}
                      >
                        Remove
                      </Button>
                    </Col>

                  </Row>
                ))}

                {/* ADD TAG BUTTON */}
                {/* <Button
                  type="dashed"
                  size="middle"
                  style={{ width: 100, borderRadius: 6 }}
                  onClick={handleAddTag}
                >
                  + Add Tag
                </Button>

              </Space>

            </Form.Item>
          </Col>
        </Row> */} 

        {/* BREAK LINE */}
        {/* <div style={{ borderBottom: "1px solid #eee", margin: "20px 0" }} /> */}

        {/* ---------------------- ROW 4 ---------------------- */}
        {/* <Row style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Checkbox>Show details</Checkbox>
          </Col>
        </Row> */}

        {/* ---------------------- ACTION BUTTONS ---------------------- */}
        <Row justify="center" gutter={16} style={{ marginTop: 10 }}>
          <Col>
            <Button size="middle">Save as</Button>
          </Col>

          <Col>
            <Button
              type="primary"
              size="middle"
              style={{ padding: "0 28px", borderRadius: 6 }}
              onClick={handleApply}
            >
              Apply
            </Button>
          </Col>

          <Col>
            <Button size="middle">Reset</Button>
          </Col>
        </Row>

      </Form>

      {/* Render the table with filtered results when Apply is pressed */}
      <div style={{ marginTop: 24 }}>
        <Suspense fallback={<div>Loading....</div>}>
        <LatestDataTable data={tableData} loading={loadingTable} />
        </Suspense>
      </div>
    </div>
  );
}