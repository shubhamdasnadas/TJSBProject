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

const ZABBIX_URL = "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";
const TOKEN = "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

// Rate limiting configuration
const API_CALL_DELAY = 100; // 100ms between API calls
const MAX_CONCURRENT_REQUESTS = 3; // Maximum concurrent API requests
const CACHE_DURATION = 30000; // 30 seconds cache

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
  host: string;
  branch: string;
  primaryBitsReceived: string;
  primaryBitsSent: string;
  averageSpeed: string;
  memoryUtilization: number;
  cpuUtilization: number;
  status?: string;
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
  
  // Filter states
  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [availableHosts, setAvailableHosts] = useState<Host[]>([]);
  const [selectedHostIds, setSelectedHostIds] = useState<string[]>([]);
  const [nameFilter, setNameFilter] = useState<string>("");

  // Cache for API responses
  const cache = useRef<Map<string, CacheEntry>>(new Map());
  
  // Request queue for rate limiting
  const requestQueue = useRef<Array<() => Promise<any>>>([]);
  const activeRequests = useRef(0);
  const isProcessingQueue = useRef(false);

  // Rate-limited API call wrapper
  const callZabbixWithCache = useCallback(async (method: string, params: any) => {
    const cacheKey = `${method}-${JSON.stringify(params)}`;
    
    // Check cache first
    const cached = cache.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📦 Cache hit for ${method}`);
      return cached.data;
    }

    // Add to queue and process
    return new Promise((resolve, reject) => {
      requestQueue.current.push(async () => {
        try {
          await new Promise(r => setTimeout(r, API_CALL_DELAY));
          
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

          // Cache the result
          cache.current.set(cacheKey, {
            data: res.data.result,
            timestamp: Date.now(),
          });

          resolve(res.data.result);
        } catch (error) {
          reject(error);
        }
      });

      processQueue();
    });
  }, []);

  // Process request queue with concurrency control
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current) return;
    isProcessingQueue.current = true;

    while (requestQueue.current.length > 0 && activeRequests.current < MAX_CONCURRENT_REQUESTS) {
      const request = requestQueue.current.shift();
      if (request) {
        activeRequests.current++;
        request().finally(() => {
          activeRequests.current--;
          processQueue();
        });
      }
    }

    isProcessingQueue.current = false;
  }, []);

  // Load host groups on mount (no auto-load to save resources)
  useEffect(() => {
    loadHostGroups();
  }, []);

  // Load hosts when groups change
  useEffect(() => {
    if (selectedGroupIds.length > 0) {
      loadHostsForGroups();
    } else {
      setAvailableHosts([]);
      setSelectedHostIds([]);
    }
  }, [selectedGroupIds]);

  const loadHostGroups = async () => {
    try {
      console.log("📦 Loading host groups...");
      const groups = await callZabbixWithCache("hostgroup.get", {
        output: ["groupid", "name"],
      });
      console.log(`✅ Loaded ${groups.length} host groups`);
      setHostGroups(groups || []);
    } catch (e: any) {
      console.error("❌ Failed to load host groups:", e);
      message.error("Failed to load host groups");
    }
  };

  const loadHostsForGroups = async () => {
    try {
      console.log("📦 Loading hosts for groups:", selectedGroupIds);
      const hosts = await callZabbixWithCache("host.get", {
        output: ["hostid", "name", "status"],
        groupids: selectedGroupIds,
        monitored: true,
      });
      console.log(`✅ Loaded ${hosts.length} hosts`);
      setAvailableHosts(hosts || []);
    } catch (e: any) {
      console.error("❌ Failed to load hosts:", e);
      message.error("Failed to load hosts");
    }
  };

  // Batch fetch items for multiple hosts at once
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

  // Batch fetch history for multiple items
  const fetchHistoryBatch = async (items: any[]) => {
    if (items.length === 0) return new Map();

    // Group items by value_type to batch history requests
    const itemsByType = new Map<string, any[]>();
    items.forEach(item => {
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
        const itemids = batch.map(item => item.itemid);

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
            const nums = values.map(h => parseFloat(h.value || "0"));
            const avg = nums.reduce((sum: number, val: number) => sum + val, 0) / nums.length;
            historyMap.set(itemid, avg);
          });
        } catch (e) {
          console.warn(`⚠️ Failed to fetch history batch for type ${valueType}`);
        }
      }
    }

    return historyMap;
  };

  const matchMetrics = (items: any[], historyMap: Map<string, number>) => {
    const results = {
      trafficIn: null as number | null,
      trafficOut: null as number | null,
      memory: null as number | null,
      cpu: null as number | null,
    };

    for (const item of items) {
      const key = item.key_.toLowerCase();
      const name = item.name.toLowerCase();
      const value = historyMap.get(item.itemid) || null;

      // Match traffic in
      if (!results.trafficIn && (
        key.includes('in[') || key.includes('incoming') || key.includes('inbound') ||
        name.includes('incoming') || name.includes('bits received') || name.includes('traffic in')
      )) {
        results.trafficIn = value;
      }

      // Match traffic out
      if (!results.trafficOut && (
        key.includes('out[') || key.includes('outgoing') || key.includes('outbound') ||
        name.includes('outgoing') || name.includes('bits sent') || name.includes('traffic out')
      )) {
        results.trafficOut = value;
      }

      // Match memory
      if (!results.memory && (
        key.includes('memory') || key.includes('mem') || name.includes('memory') || name.includes('ram')
      ) && (
        key.includes('util') || key.includes('usage') || key.includes('percent') ||
        name.includes('utilization') || name.includes('usage')
      )) {
        results.memory = value;
      }

      // Match CPU
      if (!results.cpu && (
        key.includes('cpu') || key.includes('processor') || name.includes('cpu') || name.includes('processor')
      ) && (
        key.includes('util') || key.includes('usage') || key.includes('percent') ||
        name.includes('utilization') || name.includes('usage')
      )) {
        results.cpu = value;
      }
    }

    return results;
  };

  const formatTraffic = (value: number | null): string => {
    if (!value || value <= 0) return "—";
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)} Gbps`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} Mbps`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)} kbps`;
    return `${Math.round(value)} bps`;
  };

  const calculateAverageSpeed = (inValue: number | null, outValue: number | null): string => {
    const inVal = inValue ?? 0;
    const outVal = outValue ?? 0;
    if (inVal <= 0 && outVal <= 0) return "—";
    const avgSpeed = (inVal + outVal) / 2;
    return formatTraffic(avgSpeed);
  };

  const loadData = async () => {
    // Clear request queue
    requestQueue.current = [];
    activeRequests.current = 0;
    
    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: 0 });

    try {
      // Determine which hosts to fetch
      let hostsToFetch: Host[] = [];

      if (selectedHostIds.length > 0) {
        hostsToFetch = availableHosts.filter((h) => selectedHostIds.includes(h.hostid));
      } else if (selectedGroupIds.length > 0) {
        hostsToFetch = availableHosts;
      } else {
        console.log("📦 Loading ALL monitored hosts...");
        const allHosts = await callZabbixWithCache("host.get", {
          output: ["hostid", "name", "status"],
          selectInventory: ["site_address_a"],
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
        setData([]);
        return;
      }

      setProgress({ current: 0, total: hostsToFetch.length });

      // Step 1: Batch fetch all items for all hosts
      const hostids = hostsToFetch.map(h => h.hostid);
      const itemsByHost = await fetchItemsForHosts(hostids);

      setProgress({ current: 1, total: hostsToFetch.length });

      // Step 2: Collect all items that need history
      const allItemsNeedingHistory: any[] = [];
      itemsByHost.forEach(items => {
        allItemsNeedingHistory.push(...items);
      });

      // Step 3: Batch fetch history for all items
      const historyMap = await fetchHistoryBatch(allItemsNeedingHistory);

      setProgress({ current: 2, total: hostsToFetch.length });

      // Step 4: Process each host with cached data
      const rows: Row[] = hostsToFetch.map((host, index) => {
        const items = itemsByHost.get(host.hostid) || [];
        const metrics = matchMetrics(items, historyMap);

        setProgress({ current: index + 3, total: hostsToFetch.length });

        return {
          key: host.hostid,
          host: host.name,
          branch: "-",
          primaryBitsReceived: formatTraffic(metrics.trafficIn),
          primaryBitsSent: formatTraffic(metrics.trafficOut),
          averageSpeed: calculateAverageSpeed(metrics.trafficIn, metrics.trafficOut),
          memoryUtilization: metrics.memory ?? 0,
          cpuUtilization: metrics.cpu ?? 0,
          status: String(host.status) === "0" ? "active" : "inactive",
        };
      });

      setData(rows);
      console.log(`✅ Successfully loaded ${rows.length} host(s)`);
      message.success(`Loaded ${rows.length} host(s)`);
    } catch (e: any) {
      console.error("❌ Error loading data:", e);
      setError(e.message || "Failed to fetch data");
      message.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const getUtilizationColor = (value: number) => {
    if (value > 80) return "error";
    if (value > 60) return "warning";
    return "success";
  };

  const columns = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      fixed: "left" as const,
      render: (status: string) => {
        const statusText = status || "unknown";
        const isActive = statusText === "active";
        return (
          <Tag color={isActive ? "green" : "red"} icon={<SignalFilled />}>
            {statusText.toUpperCase()}
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
      width: 220,
      fixed: "left" as const,
      sorter: (a: Row, b: Row) => a.host.localeCompare(b.host),
    },
    {
      title: "Branch",
      dataIndex: "branch",
      key: "branch",
      width: 120,
      sorter: (a: Row, b: Row) => a.branch.localeCompare(b.branch),
    },
    {
      title: "Bits Received",
      dataIndex: "primaryBitsReceived",
      key: "primaryBitsReceived",
      width: 150,
    },
    {
      title: "Bits Sent",
      dataIndex: "primaryBitsSent",
      key: "primaryBitsSent",
      width: 150,
    },
    {
      title: "Average Speed",
      dataIndex: "averageSpeed",
      key: "averageSpeed",
      width: 140,
    },
    {
      title: "Memory Usage",
      key: "memoryUtilization",
      width: 180,
      render: (_: any, row: Row) => {
        const pct = row.memoryUtilization;
        if (pct <= 0) return <span style={{ color: "#999" }}>—</span>;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Progress
              percent={Math.min(pct, 100)}
              size="small"
              status={getUtilizationColor(pct) as any}
              style={{ flex: 1, margin: 0 }}
            />
            <span style={{ minWidth: 60, fontWeight: 500 }}>{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
    {
      title: "CPU Usage",
      key: "cpuUtilization",
      width: 180,
      render: (_: any, row: Row) => {
        const pct = row.cpuUtilization;
        if (pct <= 0) return <span style={{ color: "#999" }}>—</span>;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Progress
              percent={Math.min(pct, 100)}
              size="small"
              status={getUtilizationColor(pct) as any}
              style={{ flex: 1, margin: 0 }}
            />
            <span style={{ minWidth: 60, fontWeight: 500 }}>{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ];

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
        {/* Filters Section */}
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
                  placeholder={availableHosts.length === 0 ? "Select groups first" : "All hosts in groups"}
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
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total) => `Total ${total} hosts`,
            }}
            loading={loading}
            bordered
            size="middle"
            scroll={{ x: 1400 }}
          />
        )}
      </Card>
    </div>
  );
}