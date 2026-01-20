"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Table,
  Card,
  Spin,
  Alert,
  Button,
  Tag,
  Progress,
  Select,
  Row,
  Col,
  Form,
  Input,
  message,
  Space,
} from "antd";
import { ReloadOutlined, SignalFilled, FilterOutlined } from "@ant-design/icons";
import axios from "axios";

/* =========================
   CONFIG
========================= */
const ZABBIX_URL =
  "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";
const TOKEN =
  "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

const API_CALL_DELAY = 100;
const MAX_CONCURRENT_REQUESTS = 3;
const CACHE_DURATION = 30000;

/* =========================
   TYPES
========================= */
interface HostGroup {
  groupid: string;
  name: string;
}

interface Host {
  hostid: string;
  name: string;
  status: string;
}

interface Row {
  key: string;
  hostid: string;
  host: string;
  status: string;
  itemName: string;
  itemKey: string;
  branch: string;
  bitsReceived: string;
  bitsSent: string;
  averageSpeed: string;
  memoryUsage: string;
  cpuUsage: string;
  rawValue: number | null;
  units: string;
}

interface CacheEntry {
  data: any;
  timestamp: number;
}

export default function ZabbixMonitoringDashboard() {
  const [form] = Form.useForm();

  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [availableHosts, setAvailableHosts] = useState<Host[]>([]);
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState("");

  /* =========================
     CACHE + QUEUE
  ========================= */
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const requestQueue = useRef<Array<() => Promise<any>>>([]);
  const activeRequests = useRef(0);
  const isProcessingQueue = useRef(false);

  const callZabbixWithCache = useCallback(
    async (method: string, params: any) => {
      const cacheKey = `${method}-${JSON.stringify(params)}`;
      const cached = cache.current.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`📦 Cache hit for ${method}`);
        return cached.data;
      }

      return new Promise((resolve, reject) => {
        requestQueue.current.push(async () => {
          try {
            await new Promise((r) => setTimeout(r, API_CALL_DELAY));

            const res = await axios.post(
              ZABBIX_URL,
              {
                jsonrpc: "2.0",
                method,
                params,
                id: Math.random(),
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${TOKEN}`,
                },
              }
            );

            if (res.data.error) {
              throw new Error(res.data.error.message);
            }

            cache.current.set(cacheKey, {
              data: res.data.result,
              timestamp: Date.now(),
            });

            resolve(res.data.result);
          } catch (e) {
            reject(e);
          }
        });

        processQueue();
      });
    },
    []
  );

  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current) return;
    isProcessingQueue.current = true;

    while (
      requestQueue.current.length > 0 &&
      activeRequests.current < MAX_CONCURRENT_REQUESTS
    ) {
      const req = requestQueue.current.shift();
      if (req) {
        activeRequests.current++;
        req().finally(() => {
          activeRequests.current--;
          processQueue();
        });
      }
    }

    isProcessingQueue.current = false;
  }, []);

  /* =========================
     LOADERS
  ========================= */
  useEffect(() => {
    loadHostGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupIds.length) {
      loadHostsForGroups();
    } else {
      setAvailableHosts([]);
      setSelectedHostIds([]);
    }
  }, [selectedGroupIds]);

  const loadHostGroups = async () => {
    try {
      console.log("📦 Loading host groups...");
      const res = await callZabbixWithCache("hostgroup.get", {
        output: ["groupid", "name"],
      });
      console.log(`✅ Loaded ${res.length} host groups`);
      setHostGroups(res || []);
    } catch (e) {
      console.error("❌ Failed to load host groups:", e);
      message.error("Failed to load host groups");
    }
  };

  const loadHostsForGroups = async () => {
    try {
      console.log("📦 Loading hosts for groups:", selectedGroupIds);
      const res = await callZabbixWithCache("host.get", {
        output: ["hostid", "name", "status"],
        groupids: selectedGroupIds,
        monitored: true,
      });
      console.log(`✅ Loaded ${res.length} hosts`);
      setAvailableHosts(res || []);
    } catch (e) {
      console.error("❌ Failed to load hosts:", e);
      message.error("Failed to load hosts");
    }
  };

  /* =========================
     BATCH FETCHING
  ========================= */
  const fetchItemsForHosts = async (hostids: string[]) => {
    console.log(`🔍 Fetching items for ${hostids.length} hosts in batch...`);

    const allItems = await callZabbixWithCache("item.get", {
      output: ["itemid", "name", "key_", "value_type", "units", "hostid"],
      hostids: hostids,
      monitored: true,
    });

    console.log(`📦 Found ${allItems?.length || 0} total items`);

    // Group items by hostid
    const itemsByHost = new Map<string, any[]>();
    (allItems || []).forEach((item: any) => {
      if (!itemsByHost.has(item.hostid)) {
        itemsByHost.set(item.hostid, []);
      }
      itemsByHost.get(item.hostid)?.push(item);
    });

    return itemsByHost;
  };

  const fetchHistoryBatch = async (items: any[]) => {
    if (items.length === 0) return new Map();

    // Group items by value_type to batch history requests
    const itemsByType = new Map<string, any[]>();
    items.forEach((item) => {
      const type = item.value_type;
      if (!itemsByType.has(type)) {
        itemsByType.set(type, []);
      }
      itemsByType.get(type)?.push(item);
    });

    const historyMap = new Map<string, number>();
    const now = Math.floor(Date.now() / 1000);

    // Fetch history for each value type in batches of 50 items
    for (const [valueType, typeItems] of Array.from(itemsByType.entries())) {
      const batchSize = 50;
      for (let i = 0; i < typeItems.length; i += batchSize) {
        const batch = typeItems.slice(i, i + batchSize);
        const itemids = batch.map((item) => item.itemid);

        try {
          const history = await callZabbixWithCache("history.get", {
            output: "extend",
            history: parseInt(valueType),
            itemids: itemids,
            time_from: now - 300,
            sortfield: "clock",
            sortorder: "DESC",
            limit: 10,
          });

          // Group history by itemid and calculate average
          const historyByItem = new Map<string, any[]>();
          (history || []).forEach((h: any) => {
            if (!historyByItem.has(h.itemid)) {
              historyByItem.set(h.itemid, []);
            }
            historyByItem.get(h.itemid)?.push(h);
          });

          historyByItem.forEach((values, itemid) => {
            const nums = values.map((h) => parseFloat(h.value || "0"));
            const avg =
              nums.reduce((sum: number, val: number) => sum + val, 0) /
              nums.length;
            historyMap.set(itemid, avg);
          });
        } catch (e) {
          console.warn(
            `⚠️ Failed to fetch history batch for type ${valueType}`
          );
        }
      }
    }

    return historyMap;
  };

  /* =========================
     ITEM CATEGORIZATION & FORMATTING
  ========================= */
  const categorizeItem = (item: any): string => {
    const key = item.key_.toLowerCase();
    const name = item.name.toLowerCase();

    // Traffic In
    if (
      key.includes("in[") ||
      key.includes("incoming") ||
      key.includes("inbound") ||
      name.includes("incoming") ||
      name.includes("bits received") ||
      name.includes("traffic in") ||
      name.includes("inbound")
    ) {
      return "trafficIn";
    }

    // Traffic Out
    if (
      key.includes("out[") ||
      key.includes("outgoing") ||
      key.includes("outbound") ||
      name.includes("outgoing") ||
      name.includes("bits sent") ||
      name.includes("traffic out") ||
      name.includes("outbound")
    ) {
      return "trafficOut";
    }

    // Memory
    if (
      (key.includes("memory") ||
        key.includes("mem") ||
        name.includes("memory") ||
        name.includes("ram")) &&
      (key.includes("util") ||
        key.includes("usage") ||
        key.includes("percent") ||
        name.includes("utilization") ||
        name.includes("usage") ||
        name.includes("%"))
    ) {
      return "memory";
    }

    // CPU
    if (
      (key.includes("cpu") ||
        key.includes("processor") ||
        name.includes("cpu") ||
        name.includes("processor")) &&
      (key.includes("util") ||
        key.includes("usage") ||
        key.includes("percent") ||
        name.includes("utilization") ||
        name.includes("usage") ||
        name.includes("%"))
    ) {
      return "cpu";
    }

    return "other";
  };

  const formatTraffic = (value: number | null): string => {
    if (!value || value <= 0) return "—";
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)} Gbps`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} Mbps`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)} kbps`;
    return `${Math.round(value)} bps`;
  };

  const formatPercentage = (value: number | null): string => {
    if (!value || value <= 0) return "—";
    return `${value.toFixed(1)}%`;
  };

  /* =========================
     LOAD DATA (MAIN)
  ========================= */
  const loadData = async () => {
    // Clear request queue
    requestQueue.current = [];
    activeRequests.current = 0;

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: 0 });
    setData([]);

    try {
      // Determine which hosts to fetch
      let hostsToFetch: Host[] = [];

      if (selectedHostIds.length > 0) {
        hostsToFetch = availableHosts.filter((h) =>
          selectedHostIds.includes(h.hostid)
        );
      } else if (selectedGroupIds.length > 0) {
        hostsToFetch = availableHosts;
      } else {
        console.log("📦 Loading ALL monitored hosts...");
        const allHosts = await callZabbixWithCache("host.get", {
          output: ["hostid", "name", "status"],
          monitored: true,
        });
        hostsToFetch = allHosts || [];
      }

      // Apply name filter
      if (nameFilter) {
        hostsToFetch = hostsToFetch.filter((h) =>
          h.name.toLowerCase().includes(nameFilter.toLowerCase())
        );
      }

      console.log(`🚀 Processing ${hostsToFetch.length} host(s)...`);

      if (hostsToFetch.length === 0) {
        message.warning("No hosts found matching the criteria");
        return;
      }

      setProgress({ current: 0, total: hostsToFetch.length });

      // Step 1: Batch fetch all items for all hosts
      const hostids = hostsToFetch.map((h) => h.hostid);
      const itemsByHost = await fetchItemsForHosts(hostids);

      setProgress({ current: 1, total: hostsToFetch.length });

      // Step 2: Collect all items that need history
      const allItemsNeedingHistory: any[] = [];
      itemsByHost.forEach((items) => {
        allItemsNeedingHistory.push(...items);
      });

      console.log(`📊 Fetching history for ${allItemsNeedingHistory.length} items...`);

      // Step 3: Batch fetch history for all items
      const historyMap = await fetchHistoryBatch(allItemsNeedingHistory);

      setProgress({ current: 2, total: hostsToFetch.length });

      // Step 4: Create ONE ROW PER ITEM with correct column mapping
      const rows: Row[] = [];
      
      hostsToFetch.forEach((host, hostIndex) => {
        const items = itemsByHost.get(host.hostid) || [];
        const hostStatus = String(host.status) === "0" ? "active" : "inactive";

        // For each item of this host, create a row
        items.forEach((item: any) => {
          const historyValue = historyMap.get(item.itemid);
          const category = categorizeItem(item);

          // Initialize all columns as empty
          let bitsReceived = "—";
          let bitsSent = "—";
          let averageSpeed = "—";
          let memoryUsage = "—";
          let cpuUsage = "—";

          // Populate the appropriate column based on item category
          if (category === "trafficIn") {
            bitsReceived = formatTraffic(historyValue);
          } else if (category === "trafficOut") {
            bitsSent = formatTraffic(historyValue);
          } else if (category === "memory") {
            memoryUsage = formatPercentage(historyValue);
          } else if (category === "cpu") {
            cpuUsage = formatPercentage(historyValue);
          }

          // Calculate average speed if we have traffic data
          if (category === "trafficIn" || category === "trafficOut") {
            averageSpeed = formatTraffic(historyValue);
          }

          rows.push({
            key: `${host.hostid}-${item.itemid}`,
            hostid: host.hostid,
            host: host.name,
            status: hostStatus,
            itemName: item.name || "-",
            itemKey: item.key_ || "-",
            branch: "-",
            bitsReceived,
            bitsSent,
            averageSpeed,
            memoryUsage,
            cpuUsage,
            rawValue: historyValue ?? null,
            units: item.units || "",
          });
        });

        setProgress({ current: hostIndex + 3, total: hostsToFetch.length });
      });

      setData(rows);
      console.log(`✅ Successfully loaded ${rows.length} item rows from ${hostsToFetch.length} host(s)`);
      message.success(`Loaded ${rows.length} items from ${hostsToFetch.length} host(s)`);
    } catch (e: any) {
      console.error("❌ Error loading data:", e);
      setError(e.message || "Failed to fetch data");
      message.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  /* =========================
     TABLE
  ========================= */
  const columns = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      fixed: "left" as const,
      render: (status: string) => {
        const isActive = status === "active";
        return (
          <Tag color={isActive ? "green" : "red"} icon={<SignalFilled />}>
            {status.toUpperCase()}
          </Tag>
        );
      },
      filters: [
        { text: "Active", value: "active" },
        { text: "Inactive", value: "inactive" },
      ],
      onFilter: (value: any, record: Row) => record.status === value,
    },
    {
      title: "Host",
      dataIndex: "host",
      key: "host",
      width: 200,
      fixed: "left" as const,
      sorter: (a: Row, b: Row) => a.host.localeCompare(b.host),
    },
    {
      title: "Item Name",
      dataIndex: "itemName",
      key: "itemName",
      width: 250,
      sorter: (a: Row, b: Row) => a.itemName.localeCompare(b.itemName),
    },
    {
      title: "Item Key",
      dataIndex: "itemKey",
      key: "itemKey",
      width: 200,
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      width: 100,
    },
    {
      title: "Bits Received",
      dataIndex: "bitsReceived",
      key: "bitsReceived",
      width: 140,
      render: (value: string) => (
        <span style={{ color: value === "—" ? "#999" : "inherit" }}>
          {value}
        </span>
      ),
    },
    {
      title: "Bits Sent",
      dataIndex: "bitsSent",
      key: "bitsSent",
      width: 140,
      render: (value: string) => (
        <span style={{ color: value === "—" ? "#999" : "inherit" }}>
          {value}
        </span>
      ),
    },
    {
      title: "Average Speed",
      dataIndex: "averageSpeed",
      key: "averageSpeed",
      width: 140,
      render: (value: string) => (
        <span style={{ color: value === "—" ? "#999" : "inherit" }}>
          {value}
        </span>
      ),
    },
    {
      title: "Memory Usage",
      dataIndex: "memoryUsage",
      key: "memoryUsage",
      width: 140,
      render: (value: string) => (
        <span style={{ 
          color: value === "—" ? "#999" : "inherit",
          fontWeight: value !== "—" ? 500 : "normal"
        }}>
          {value}
        </span>
      ),
    },
    {
      title: "CPU Usage",
      dataIndex: "cpuUsage",
      key: "cpuUsage",
      width: 140,
      render: (value: string) => (
        <span style={{ 
          color: value === "—" ? "#999" : "inherit",
          fontWeight: value !== "—" ? 500 : "normal"
        }}>
          {value}
        </span>
      ),
    },
  ];

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ padding: "24px", background: "#f0f2f5", minHeight: "100vh" }}>
      <Card
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SignalFilled style={{ fontSize: 20, color: "#1890ff" }} />
            <span style={{ fontSize: 18, fontWeight: 600 }}>
              Zabbix Monitoring Dashboard
            </span>
          </div>
        }
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
      >
        {/* Info Alert */}
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="💡 Optimized Performance"
            description="This dashboard uses caching (30s) and batching to minimize API calls. Click 'Apply' to load data."
            type="info"
            showIcon
            closable
            style={{ marginBottom: 16 }}
          />
        </div>

        {/* Filters Form */}
        <Form
          form={form}
          layout="vertical"
          style={{
            background: "#fafafa",
            padding: 20,
            borderRadius: 8,
            marginBottom: 20,
            border: "1px solid #e6e6e6",
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="🔍 Name Filter" style={{ marginBottom: 0 }}>
                <Input
                  placeholder="Type hostname..."
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="📁 Host Groups" style={{ marginBottom: 0 }}>
                <Select
                  mode="multiple"
                  placeholder="All groups"
                  value={selectedGroupIds}
                  onChange={setSelectedGroupIds}
                  allowClear
                  options={hostGroups.map((g) => ({
                    value: g.groupid,
                    label: g.name,
                  }))}
                  maxTagCount="responsive"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label="🖥️ Specific Hosts" style={{ marginBottom: 0 }}>
                <Select
                  mode="multiple"
                  placeholder={
                    availableHosts.length === 0
                      ? "Select groups first"
                      : "All hosts in groups"
                  }
                  value={selectedHostIds}
                  onChange={setSelectedHostIds}
                  disabled={availableHosts.length === 0}
                  allowClear
                  options={availableHosts.map((h) => ({
                    value: h.hostid,
                    label: h.name,
                  }))}
                  maxTagCount="responsive"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label=" " style={{ marginBottom: 0 }}>
                <Space style={{ width: "100%" }}>
                  <Button
                    type="primary"
                    icon={<FilterOutlined />}
                    onClick={loadData}
                    loading={loading}
                    size="large"
                    block
                  >
                    Apply
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={loadData}
                    loading={loading}
                    size="large"
                  >
                    Refresh
                  </Button>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message="Error"
            description={error}
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Progress indicator */}
        {loading && progress.total > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Progress
              percent={Math.round((progress.current / progress.total) * 100)}
              status="active"
            />
            <p style={{ textAlign: "center", color: "#666", marginTop: 8 }}>
              Processing {progress.current} of {progress.total} hosts...
            </p>
          </div>
        )}

        {/* Summary Tags */}
        {data.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
              Total Hosts: {data.length}
            </Tag>
            <Tag color="green" style={{ fontSize: 14, padding: "4px 12px" }}>
              Active: {data.filter((d) => d.status === "active").length}
            </Tag>
            <Tag color="red" style={{ fontSize: 14, padding: "4px 12px" }}>
              Inactive: {data.filter((d) => d.status === "inactive").length}
            </Tag>
          </div>
        )}

        {/* Table */}
        {loading && data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Spin size="large" />
            <p style={{ marginTop: 16, color: "#666" }}>
              Loading hosts and metrics...
            </p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={data}
            pagination={{
              pageSize: 50,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total) => `Total ${total} hosts`,
            }}
            loading={loading}
            bordered
            size="middle"
            scroll={{ x: 1600 }}
          />
        )}
      </Card>
    </div>
  );
}