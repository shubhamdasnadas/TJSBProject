 "use client";

import React, { useEffect, useState } from "react";
 
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Form,
  Row,
  Col,
  Divider,
  Tag,
  Table,
  Radio,
  Checkbox,
  Modal,
} from "antd";
import axios from "axios";

// =========================
// Types
// =========================
interface LatestInterface {
  ip: string;
  dns: string;
  port: string;
  type: string;
  available: string;
  active_available?: string;
}

interface TriggerItem {
  triggerid: string;
  timestamp: string;
  time_from?: number;
  time_till?: number;
  hostname: string;
  hostid?: string;
  description: string;
  comments?: string;
  priority: string;
  status: string;
  depends_on?: string;
  tags?: Array<{ tag: string; value: string }>;
  recovery_time?: string;
  acknowledgement?: string;
  interface?: {
    ip: string;
    dns?: string;
    port?: string;
    type: string;
  };
}

interface HostItem {
  hostid: string;
  host: string;
  latest_interface: LatestInterface;
  latest_ip: string;
}

interface Props {
  filterHost: any[];
  filterFormData: any;
  setFilterFormData: any;
  handleapply: () => void;
  updateFilter: HostItem[] | [];
}

// =========================
// Component
// =========================
const HostFilterCard = ({
  filterHost,
  filterFormData,
  setFilterFormData,
  handleapply,
  updateFilter,
}: Props) => {
  const user_token = typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : null;
  const [hostGroups, setHostGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loadingTriggers, setLoadingTriggers] = useState(false);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [hostInterfaces, setHostInterfaces] = useState<{ [key: string]: any }>({});
  const [hostInventory, setHostInventory] = useState<any[]>([]);
  const [triggersModalVisible, setTriggersModalVisible] = useState(false);
  const [triggerModalSelectedGroup, setTriggerModalSelectedGroup] = useState<string>('');
  const [triggerModalSelectedTriggers, setTriggerModalSelectedTriggers] = useState<string[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [inventoryRows, setInventoryRows] = useState<Array<{ id: string; field: string; value: string }>>(
    [{ id: '1', field: '', value: '' }]
  );
  const [tableData, setTableData] = useState<TriggerItem[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [showType, setShowType] = useState('recent');
  const [tagName, setTagName] = useState('');
  const [tagOperator, setTagOperator] = useState('contains');
  const [tagValue, setTagValue] = useState('');
  const [tagLogic, setTagLogic] = useState('and');
  const [severityFilters, setSeverityFilters] = useState({
    notClassified: false,
    information: false,
    warning: false,
    average: false,
    high: false,
    disaster: false,
  });

  // Fetch host groups on mount
  const handleGetHostGroups = async () => {
    setLoadingGroups(true);

    const payload = {
      jsonrpc: '2.0',
      method: 'hostgroup.get',
      params: {
        output: ['groupid', 'name'],
      },
      auth: '7de73a2634c45b95faaecb45d0429286005a442e974352f4431eaee833a66d00',
      id: 1,
    };

    try {
      const response = await axios.post('/api/zabbix-proxy', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const items = response?.data?.result ?? [];
      const normalized = Array.isArray(items)
        ? items.map((g: any) => ({ groupid: String(g.groupid), name: g.name }))
        : [];

      setHostGroups(normalized);
    } catch (err: any) {
      console.error('Hostgroup fetch error', err);
      setHostGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch hosts based on selected host groups
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
      auth: '7de73a2634c45b95faaecb45d0429286005a442e974352f4431eaee833a66d00',
      id: 2,
    };

    try {
      const response = await axios.post('/api/zabbix-proxy', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const items = response?.data?.result ?? [];
      const normalized = Array.isArray(items)
        ? items.map((h: any) => ({ hostid: String(h.hostid), name: h.name }))
        : [];

      setHosts(normalized);
    } catch (err: any) {
      console.error('Hosts fetch error', err);
      setHosts([]);
    } finally {
      setLoadingHosts(false);
    }
  };

  // Fetch triggers for selected host groups
  const handleGetTriggers = async (groupIds: string[]) => {
    if (!groupIds?.length) {
      setTriggers([]);
      return;
    }

    setLoadingTriggers(true);

    const payload = {
      jsonrpc: '2.0',
      method: 'trigger.get',
      params: {
        output: ['triggerid', 'description', 'priority', 'status'],
        selectHosts: ['hostid', 'name'],
        groupids: groupIds,
        expandDescription: true,
      },
      auth: '7de73a2634c45b95faaecb45d0429286005a442e974352f4431eaee833a66d00',
      id: 5,
    };

    try {
      const response = await axios.post('/api/zabbix-proxy', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const items = response?.data?.result ?? [];
      const normalized = Array.isArray(items)
        ? items.map((t: any) => ({
            triggerid: String(t.triggerid),
            description: t.description,
            priority: t.priority,
            status: t.status,
            hostid: t.hosts?.[0]?.hostid,
          }))
        : [];

      setTriggers(normalized);
    } catch (err: any) {
      console.error('Triggers fetch error', err);
      setTriggers([]);
    } finally {
      setLoadingTriggers(false);
    }
  };

  // Fetch triggers for modal (single group)
  const handleGetTriggersForModal = async (groupId: string) => {
    if (!groupId) {
      setTriggers([]);
      return;
    }

    setLoadingTriggers(true);

    const payload = {
      jsonrpc: '2.0',
      method: 'trigger.get',
      params: {
        output: ['triggerid', 'description', 'priority', 'status'],
        selectHosts: ['hostid', 'name'],
        groupids: [groupId],
        expandDescription: true,
      },
      auth: '7de73a2634c45b95faaecb45d0429286005a442e974352f4431eaee833a66d00',
      id: 5,
    };

    try {
      const response = await axios.post('/api/zabbix-proxy', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const items = response?.data?.result ?? [];
      const normalized = Array.isArray(items)
        ? items.map((t: any) => ({
            triggerid: String(t.triggerid),
            description: t.description,
            priority: t.priority,
            status: t.status,
            hostid: t.hosts?.[0]?.hostid,
            hostname: t.hosts?.[0]?.name || 'Unknown',
          }))
        : [];

      setTriggers(normalized);
    } catch (err: any) {
      console.error('Triggers fetch error', err);
      setTriggers([]);
    } finally {
      setLoadingTriggers(false);
    }
  };

  // Fetch host interfaces
  const handleGetHostInterfaces = async (hostIds: string[]) => {
    if (!hostIds?.length) {
      setHostInterfaces({});
      return;
    }

    const payload = {
      jsonrpc: '2.0',
      method: 'hostinterface.get',
      params: {
        output: ['hostid', 'ip', 'dns', 'port', 'type', 'main'],
        hostids: hostIds,
      },
      auth: '7de73a2634c45b95faaecb45d0429286005a442e974352f4431eaee833a66d00',
      id: 6,
    };

    try {
      const response = await axios.post('/api/zabbix-proxy', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const items = response?.data?.result ?? [];
      const interfaceMap: { [key: string]: any } = {};

      items.forEach((iface: any) => {
        if (iface.main === '1') {
          interfaceMap[iface.hostid] = {
            ip: iface.ip,
            dns: iface.dns,
            port: iface.port,
            type: iface.type,
          };
        }
      });

      setHostInterfaces(interfaceMap);
    } catch (err: any) {
      console.error('Host interfaces fetch error', err);
      setHostInterfaces({});
    }
  };

  // Fetch host inventory fields
  const handleGetInventory = async () => {
    setLoadingInventory(true);

    const inventoryFields = [
      { key: 'type', label: 'Type' },
      { key: 'type_full', label: 'Type (Full details)' },
      { key: 'name', label: 'Name' },
      { key: 'alias', label: 'Alias' },
      { key: 'os', label: 'OS' },
      { key: 'os_full', label: 'OS (Full details)' },
      { key: 'os_short', label: 'OS (Short)' },
      { key: 'serial_number_a', label: 'Serial number A' },
      { key: 'serial_number_b', label: 'Serial number B' },
      { key: 'tag', label: 'Tag' },
      { key: 'asset_tag', label: 'Asset tag' },
      { key: 'macaddress_a', label: 'MAC address A' },
      { key: 'macaddress_b', label: 'MAC address B' },
      { key: 'hardware', label: 'Hardware' },
      { key: 'hardware_full', label: 'Hardware (Full details)' },
    ];

    try {
      setHostInventory(inventoryFields);
    } catch (err: any) {
      console.error('Inventory fetch error', err);
      setHostInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Inventory row management
  const addInventoryRow = () => {
    const newId = String(Math.random());
    setInventoryRows([...inventoryRows, { id: newId, field: '', value: '' }]);
  };

  const removeInventoryRow = (id: string) => {
    if (inventoryRows.length > 1) {
      setInventoryRows(inventoryRows.filter(row => row.id !== id));
    }
  };

  const updateInventoryRow = (id: string, field: 'field' | 'value', value: string) => {
    setInventoryRows(inventoryRows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // Auto-fetch hosts and triggers when selected groups change
  useEffect(() => {
    handleGetHosts(selectedGroups);
    handleGetTriggers(selectedGroups);
  }, [selectedGroups]);

  // Fetch interfaces when hosts change
  useEffect(() => {
    handleGetHostInterfaces(selectedHosts);
  }, [selectedHosts]);

  // Apply filters and fetch problem data with timestamps
  const handleApplyFilters = async () => {
    setLoadingTable(true);

    const problemParams: any = {
      output: ['eventid', 'objectid', 'clock', 'r_clock', 'name', 'acknowledged', 'severity'],
      selectTags: ['tag', 'value'],
      recent: true,
      sortfield: ['eventid'],
      sortorder: 'DESC',
    };

    if (selectedGroups?.length) {
      problemParams.groupids = selectedGroups;
    }

    if (selectedHosts?.length) {
      problemParams.hostids = selectedHosts;
    }

    if (selectedTriggers?.length) {
      problemParams.objectids = selectedTriggers;
    }

    const problemPayload = {
      jsonrpc: '2.0',
      method: 'problem.get',
      params: problemParams,
      auth:  user_token ,
      id: 3,
    };

    try {
      const problemResponse = await axios.post('/api/zabbix-proxy', problemPayload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const problems = problemResponse?.data?.result ?? [];

      if (!Array.isArray(problems) || problems.length === 0) {
        setTableData([]);
        return;
      }

      // Get trigger IDs to fetch trigger details
      const triggerIds = Array.from(new Set(problems.map((p: any) => p.objectid)));

      const triggerPayload = {
        jsonrpc: '2.0',
        method: 'trigger.get',
        params: {
          output: ['triggerid', 'description', 'priority', 'status', 'comments'],
          selectHosts: ['hostid', 'name'],
          selectDependencies: ['triggerid', 'description'],
          triggerids: triggerIds,
          expandDescription: true,
        },
        auth: '7de73a2634c45b95faaecb45d0429286005a442e974352f4431eaee833a66d00',
        id: 4,
      };

      const triggerResponse = await axios.post('/api/zabbix-proxy', triggerPayload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const triggers = triggerResponse?.data?.result ?? [];
      const triggerMap: { [key: string]: any } = {};
      triggers.forEach((trigger: any) => {
        triggerMap[trigger.triggerid] = trigger;
      });

      const formatted = problems.map((problem: any) => {
        const trigger = triggerMap[problem.objectid];
        const hostname = trigger?.hosts?.[0]?.name || 'Unknown';
        const hostid = trigger?.hosts?.[0]?.hostid || '';
        const dependencies = trigger?.dependencies || [];
        const dependsOnText = dependencies.length > 0
          ? dependencies.map((dep: any) => dep.description).join(', ')
          : '';
        
        const timestamp = problem.clock
          ? new Date(Number(problem.clock) * 1000).toLocaleString()
          : '-';

        const recoveryTimestamp = problem.r_clock && Number(problem.r_clock) > 0
          ? new Date(Number(problem.r_clock) * 1000).toLocaleString()
          : '-';

        return {
          key: problem.eventid,
          triggerid: problem.objectid,
          timestamp: timestamp,
          time_from: problem.clock ? Number(problem.clock) : undefined,
          time_till: problem.r_clock && Number(problem.r_clock) > 0 ? Number(problem.r_clock) : undefined,
          hostname: hostname,
          hostid: hostid,
          description: problem.name || trigger?.description || '',
          comments: trigger?.comments || '',
          priority: problem.severity || trigger?.priority || '0',
          status: trigger?.status || '0',
          depends_on: dependsOnText,
          tags: problem.tags || [],
          recovery_time: recoveryTimestamp,
          acknowledgement: problem.acknowledged === '1' ? 'Yes' : 'No',
        };
      });

      setTableData(formatted);
    } catch (err: any) {
      console.error('Table fetch failed', err);
      setTableData([]);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    handleGetHostGroups();
    handleGetInventory();
    handleApplyFilters();
  }, []);

  const getSeverityTag = (priority: string) => {
    const p = Number(priority);
    const baseStyle = {
      fontSize: '12px',
      fontWeight: 500,
      border: 'none',
      padding: '3px 10px',
      borderRadius: '4px'
    };
    
    switch (p) {
      case 0:
        return <Tag style={{ ...baseStyle, background: '#f5f5f5', color: '#8c8c8c' }}>Not classified</Tag>;
      case 1:
        return <Tag style={{ ...baseStyle, background: '#e6f7ff', color: '#1890ff' }}>Information</Tag>;
      case 2:
        return <Tag style={{ ...baseStyle, background: '#fff7e6', color: '#fa8c16' }}>Warning</Tag>;
      case 3:
        return <Tag style={{ ...baseStyle, background: '#fffbe6', color: '#faad14' }}>Average</Tag>;
      case 4:
        return <Tag style={{ ...baseStyle, background: '#fff1f0', color: '#f5222d' }}>High</Tag>;
      case 5:
        return <Tag style={{ ...baseStyle, background: '#f9f0ff', color: '#722ed1' }}>Disaster</Tag>;
      default:
        return <Tag style={baseStyle}>Unknown</Tag>;
    }
  };

  const getStatusTag = (status: string) => {
    const baseStyle = {
      fontSize: '12px',
      fontWeight: 500,
      border: 'none',
      padding: '3px 10px',
      borderRadius: '4px'
    };
    
    return status === '0' ? (
      <Tag style={{ ...baseStyle, background: '#f6ffed', color: '#52c41a' }}>Enabled</Tag>
    ) : (
      <Tag style={{ ...baseStyle, background: '#f5f5f5', color: '#8c8c8c' }}>Disabled</Tag>
    );
  };

  const columns = [
    {
      title: <Checkbox />,
      key: "checkbox",
      width: 50,
      fixed: 'left' as const,
      render: () => <Checkbox />,
    },
    {
      title: "Time",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 130,
      render: (text: string, record: TriggerItem) => {
        if (!record.time_from) return <span style={{ fontSize: '13px', color: '#8c8c8c' }}>-</span>;
        
        const date = new Date(record.time_from * 1000);
        const timeStr = date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        });
        const dateStr = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        
        return (
          <div>
            <div style={{ color: '#1677ff', fontSize: '13px', fontWeight: 500 }}>{timeStr}</div>
            <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: 2 }}>{dateStr}</div>
          </div>
        );
      },
    },
    {
      title: "Severity",
      dataIndex: "priority",
      key: "priority",
      width: 110,
      render: (priority: string) => getSeverityTag(priority),
    },
    {
      title: "Recovery time",
      key: "recovery",
      width: 130,
      render: (text: string, record: TriggerItem) => {
        if (!record.time_till) return <span style={{ fontSize: '13px', color: '#8c8c8c' }}>-</span>;
        
        const date = new Date(record.time_till * 1000);
        const timeStr = date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: false 
        });
        const dateStr = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        
        return (
          <div>
            <div style={{ color: '#52c41a', fontSize: '13px', fontWeight: 500 }}>{timeStr}</div>
            <div style={{ color: '#8c8c8c', fontSize: '12px', marginTop: 2 }}>{dateStr}</div>
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "Interface",
      key: "interface",
      width: 90,
      render: (text: string, record: TriggerItem) => {
        const iface = record.hostid ? hostInterfaces[record.hostid] : null;
        if (!iface) {
          return <span style={{ fontSize: '13px', color: '#8c8c8c' }}>-</span>;
        }
        return (
          <div style={{ fontSize: '13px', color: '#262626' }}>
            {iface.ip || '-'}
          </div>
        );
      },
    },
    {
      title: "Info",
      key: "info",
      width: 60,
      render: () => <span style={{ fontSize: '13px', color: '#8c8c8c' }}>-</span>,
    },
    {
      title: "Host",
      dataIndex: "hostname",
      key: "hostname",
      width: 180,
      render: (text: string) => (
        <a style={{ color: '#1677ff', fontSize: '13px', fontWeight: 500 }}>{text}</a>
      ),
    },
    {
      title: "Problem",
      dataIndex: "description",
      key: "description",
      width: 350,
      render: (text: string, record: TriggerItem) => (
        <div>
          <a style={{ color: '#1677ff', fontSize: '13px', fontWeight: 500 }}>{text}</a>
          {record.depends_on && (
            <div style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 4 }}>
              Depends on: {record.depends_on}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Duration",
      key: "duration",
      width: 90,
      render: (text: string, record: TriggerItem) => {
        if (!record.time_from) return <span style={{ fontSize: '13px', color: '#8c8c8c' }}>-</span>;
        
        const DurationCell = () => {
          const [duration, setDuration] = React.useState('');
          
          React.useEffect(() => {
            const calculateDuration = () => {
              const startTime = record.time_from! * 1000;
              const endTime = record.time_till ? record.time_till * 1000 : Date.now();
              const diffMs = endTime - startTime;
              
              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
              
              let result = '';
              if (days > 0) result = `${days}d ${hours}h ${minutes}m`;
              else if (hours > 0) result = `${hours}h ${minutes}m ${seconds}s`;
              else if (minutes > 0) result = `${minutes}m ${seconds}s`;
              else result = `${seconds}s`;
              
              setDuration(result);
            };
            
            calculateDuration();
            const interval = setInterval(calculateDuration, 1000);
            
            return () => clearInterval(interval);
          }, []);
          
          return <span style={{ fontSize: '13px', color: '#262626' }}>{duration}</span>;
        };
        
        return <DurationCell />;
      },
    },
    {
      title: "Update",
      key: "update",
      width: 80,
      render: () => (
        <a style={{ color: '#1677ff', fontSize: '13px', fontWeight: 500 }}>Update</a>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: () => (
        <a style={{ color: '#1677ff', fontSize: '13px', fontWeight: 500 }}>Actions</a>
      ),
    },
    {
      title: "Tags",
      key: "tags",
      width: 400,
      render: (text: string, record: TriggerItem) => {
        if (!record.tags || record.tags.length === 0) {
          return <span style={{ fontSize: '13px', color: '#8c8c8c' }}>-</span>;
        }
        
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '100%', overflow: 'visible' }}>
            {record.tags.map((tag, index) => {
              // Determine color based on tag name
              let color = '#1677ff';
              const tagLower = tag.tag.toLowerCase();
              
              if (tagLower.includes('scope')) color = '#1677ff';
              else if (tagLower.includes('component')) color = '#52c41a';
              else if (tagLower.includes('description') || tagLower.includes('name')) color = '#fa8c16';
              else if (tagLower.includes('interface')) color = '#722ed1';
              else if (tagLower.includes('target')) color = '#eb2f96';
              else if (tagLower.includes('service')) color = '#722ed1';
              else if (tagLower.includes('class')) color = '#13c2c2';
              else if (tagLower.includes('link')) color = '#1677ff';
              else if (tagLower.includes('label')) color = '#eb2f96';
              
              return (
                <span 
                  key={index} 
                  style={{ 
                    fontSize: '12px',
                    color: color,
                    fontWeight: 400,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    maxWidth: '100%',
                    display: 'inline-block'
                  }}
                >
                  {tag.tag}{tag.value ? `: ${tag.value}` : ''}
                </span>
              );
            })}
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ 
      background: '#f0f2f5', 
      minHeight: '100vh', 
      padding: '28px 40px'
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
          
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }
          
          .spacious-filter-section {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 28px;
            margin-bottom: 24px;
          }
          
          .spacious-label {
            color: #2c3e50;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 10px;
            display: block;
          }
          
          .ant-select-selector,
          .ant-input {
            border-radius: 6px !important;
            border: 1px solid #d9d9d9 !important;
            font-size: 14px !important;
            min-height: 40px !important;
            padding: 8px 12px !important;
            transition: all 0.2s ease !important;
          }
          
          .ant-select-selector:hover,
          .ant-input:hover {
            border-color: #1677ff !important;
          }
          
          .ant-select-selector:focus,
          .ant-input:focus,
          .ant-select-focused .ant-select-selector {
            border-color: #1677ff !important;
            box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1) !important;
          }
          
          .ant-btn {
            border-radius: 6px;
            font-weight: 500;
            transition: all 0.2s ease;
            height: 36px;
            padding: 0 18px;
            font-size: 14px;
          }
          
          .ant-btn-primary {
            background: #1677ff;
            border-color: #1677ff;
            box-shadow: 0 1px 2px rgba(22, 119, 255, 0.1);
          }
          
          .ant-btn-primary:hover {
            background: #4096ff !important;
            border-color: #4096ff !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(22, 119, 255, 0.2);
          }
          
          .ant-btn-default {
            background: #ffffff;
            border: 1px solid #d9d9d9;
          }
          
          .ant-btn-default:hover {
            border-color: #1677ff !important;
            color: #1677ff !important;
          }
          
          .ant-btn-link {
            color: #1677ff;
            font-weight: 500;
            padding: 0;
            height: auto;
          }
          
          .ant-btn-link:hover {
            color: #4096ff !important;
          }
          
          .show-type-buttons .ant-btn {
            min-width: 130px;
            margin-right: 8px;
          }
          
          .spacious-table-wrapper {
            background: white;
            border: 1px solid #d9d9d9;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .spacious-table-wrapper .ant-table {
            font-size: 13px;
          }
          
          .spacious-table-wrapper .ant-table-thead > tr > th {
            background: #fafafa;
            font-size: 13px;
            font-weight: 600;
            padding: 12px 12px;
            border-bottom: 1px solid #d9d9d9;
            color: #262626;
          }
          
          .spacious-table-wrapper .ant-table-tbody > tr > td {
            padding: 12px 12px;
            font-size: 13px;
            border-bottom: 1px solid #f0f0f0;
            vertical-align: top;
          }
          
          .spacious-table-wrapper .ant-table-tbody > tr:hover > td {
            background: #fafafa !important;
          }
          
          .spacious-table-wrapper .ant-table-tbody > tr:last-child > td {
            border-bottom: none;
          }
          
          .spacious-table-wrapper .ant-pagination {
            padding: 16px;
            margin: 0;
          }
          
          .ant-checkbox-wrapper {
            font-size: 14px;
          }
          
          .ant-checkbox-inner {
            width: 17px;
            height: 17px;
            border-radius: 4px;
            border-color: #d0d0d0;
          }
          
          .ant-checkbox-checked .ant-checkbox-inner {
            background-color: #1677ff;
            border-color: #1677ff;
          }
          
          .ant-tag {
            border-radius: 4px;
            padding: 3px 10px;
            font-size: 13px;
            font-weight: 500;
            border: none;
          }
          
          .ant-divider {
            border-color: #e8e8e8;
            margin: 20px 0;
          }
          
          .ant-modal-header {
            background: #fafafa;
            border-bottom: 1px solid #e0e0e0;
            padding: 18px 24px;
          }
          
          .ant-modal-title {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
          }
          
          .ant-modal-body {
            padding: 24px;
          }
          
          .ant-modal-footer {
            padding: 16px 24px;
            border-top: 1px solid #e0e0e0;
          }
          
          .ant-select-selection-item {
            background: #e6f7ff !important;
            border: 1px solid #91d5ff !important;
            border-radius: 4px !important;
            padding: 2px 8px !important;
            font-size: 13px !important;
          }
          
          .ant-radio-button-wrapper {
            border-radius: 4px !important;
            border: 1px solid #d9d9d9 !important;
            height: 32px;
            line-height: 30px;
            padding: 0 15px;
            font-size: 14px;
          }
          
          .ant-radio-button-wrapper:first-child {
            border-radius: 4px 0 0 4px !important;
          }
          
          .ant-radio-button-wrapper:last-child {
            border-radius: 0 4px 4px 0 !important;
          }
          
          .ant-radio-button-wrapper-checked {
            background: #1677ff !important;
            border-color: #1677ff !important;
            color: white !important;
          }
        `}
      </style>

      {/* Filter Section */}
      <div className="spacious-filter-section">
        {/* Show Type */}
        <div style={{ marginBottom: 28 }}>
          <span className="spacious-label">Show</span>
          <div className="show-type-buttons">
            <Button 
              type={showType === 'recent' ? 'primary' : 'default'} 
              onClick={() => setShowType('recent')}
            >
              Recent problems
            </Button>
            <Button 
              type={showType === 'problems' ? 'primary' : 'default'} 
              onClick={() => setShowType('problems')}
            >
              Problems
            </Button>
            <Button 
              type={showType === 'history' ? 'primary' : 'default'} 
              onClick={() => setShowType('history')}
            >
              History
            </Button>
          </div>
        </div>

        {/* Main Filters Row */}
        <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
          <Col span={6}>
            <span className="spacious-label">Host groups</span>
            <Select
              mode="tags"
              value={selectedGroups}
              loading={loadingGroups}
              style={{ width: '100%' }}
              onChange={setSelectedGroups}
              placeholder="type here to search"
              options={hostGroups.map(g => ({ value: g.groupid, label: g.name }))}
            />
            <Button type="link" style={{ marginTop: 6 }}>
              Select
            </Button>
          </Col>

          <Col span={6}>
            <span className="spacious-label">Hosts</span>
            <Select
              mode="tags"
              value={selectedHosts}
              loading={loadingHosts}
              style={{ width: '100%' }}
              onChange={setSelectedHosts}
              placeholder="type here to search"
              options={hosts.map(h => ({ value: h.hostid, label: h.name }))}
            />
            <Button type="link" style={{ marginTop: 6 }}>
              Select
            </Button>
          </Col>

          <Col span={6}>
            <span className="spacious-label">Triggers</span>
            <Button 
              type="primary" 
              style={{ width: '100%' }}
              onClick={() => setTriggersModalVisible(true)}
            >
              Select Triggers
            </Button>
          </Col>

          <Col span={6}>
            <span className="spacious-label">Problem</span>
            <Input
              placeholder=""
            />
          </Col>
        </Row>

        {/* Severity Checkboxes */}
        <div style={{ marginBottom: 28 }}>
          <span className="spacious-label">Severity</span>
          <Space wrap size={[16, 12]}>
            <Checkbox 
              checked={severityFilters.notClassified}
              onChange={(e) => setSeverityFilters({...severityFilters, notClassified: e.target.checked})}
            >
              Not classified
            </Checkbox>
            <Checkbox
              checked={severityFilters.information}
              onChange={(e) => setSeverityFilters({...severityFilters, information: e.target.checked})}
            >
              Information
            </Checkbox>
            <Checkbox
              checked={severityFilters.warning}
              onChange={(e) => setSeverityFilters({...severityFilters, warning: e.target.checked})}
            >
              Warning
            </Checkbox>
            <Checkbox
              checked={severityFilters.average}
              onChange={(e) => setSeverityFilters({...severityFilters, average: e.target.checked})}
            >
              Average
            </Checkbox>
            <Checkbox
              checked={severityFilters.high}
              onChange={(e) => setSeverityFilters({...severityFilters, high: e.target.checked})}
            >
              High
            </Checkbox>
            <Checkbox
              checked={severityFilters.disaster}
              onChange={(e) => setSeverityFilters({...severityFilters, disaster: e.target.checked})}
            >
              Disaster
            </Checkbox>
          </Space>
        </div>

        {/* Host Inventory and Tags Row */}
        <Row gutter={[20, 0]}>
          <Col span={6}>
            <span className="spacious-label">Host inventory</span>
            {inventoryRows.map((row) => (
              <Space key={row.id} style={{ width: '100%', marginBottom: 10 }}>
                <Select
                  style={{ width: 140 }}
                  placeholder="Type"
                  value={row.field}
                  onChange={(value) => updateInventoryRow(row.id, 'field', value)}
                  options={hostInventory.map(field => ({ value: field.key, label: field.label }))}
                />
                <Input
                  placeholder="value"
                  value={row.value}
                  onChange={(e) => updateInventoryRow(row.id, 'value', e.target.value)}
                  style={{ width: 140 }}
                />
                {inventoryRows.length > 1 && (
                  <Button
                    type="link"
                    danger
                    onClick={() => removeInventoryRow(row.id)}
                  >
                    Remove
                  </Button>
                )}
              </Space>
            ))}
            <Button type="link" onClick={addInventoryRow} style={{ marginTop: 4 }}>
              Add
            </Button>
          </Col>

          <Col span={12}>
            <span className="spacious-label">Tags</span>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space>
                <Radio.Group value={tagLogic} onChange={(e) => setTagLogic(e.target.value)}>
                  <Radio.Button value="and">And/Or</Radio.Button>
                  <Radio.Button value="or">Or</Radio.Button>
                </Radio.Group>
                <Input 
                  placeholder="tag" 
                  value={tagName} 
                  onChange={(e) => setTagName(e.target.value)}
                  style={{ width: 180 }}
                />
              </Space>
              <Space>
                <Select 
                  value={tagOperator} 
                  onChange={setTagOperator} 
                  style={{ width: 180 }}
                >
                  <Select.Option value="contains">Contains</Select.Option>
                  <Select.Option value="equals">Equals</Select.Option>
                  <Select.Option value="exists">Exists</Select.Option>
                </Select>
                <Input 
                  placeholder="value" 
                  value={tagValue} 
                  onChange={(e) => setTagValue(e.target.value)}
                  style={{ width: 180 }}
                />
              </Space>
              <Space>
                <Button type="link">Add</Button>
                <Button type="link">Remove</Button>
              </Space>
            </Space>
          </Col>
        </Row>

        <Divider />

        {/* Action Buttons */}
        <Row justify="end" gutter={12}>
          <Col>
            <Button 
              onClick={() => {
                setSelectedGroups([]);
                setSelectedHosts([]);
                setSelectedTriggers([]);
                setInventoryRows([{ id: '1', field: '', value: '' }]);
                setTagName('');
                setTagValue('');
                setShowType('recent');
                setSeverityFilters({
                  notClassified: false,
                  information: false,
                  warning: false,
                  average: false,
                  high: false,
                  disaster: false,
                });
              }}
            >
              Reset
            </Button>
          </Col>
          <Col>
            <Button 
              type="primary" 
              onClick={handleApplyFilters} 
              loading={loadingTable}
            >
              Apply
            </Button>
          </Col>
        </Row>
      </div>

      {/* Table */}
      <div className="spacious-table-wrapper">
        <Table
          columns={columns}
          dataSource={tableData}
          loading={loadingTable}
          pagination={{ 
            position: ['topLeft', 'bottomRight'], 
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`
          }}
        />
      </div>

      {/* Triggers Selection Modal */}
      <Modal
        title="Triggers"
        open={triggersModalVisible}
        onCancel={() => {
          setTriggersModalVisible(false);
          setTriggerModalSelectedGroup('');
          setTriggerModalSelectedTriggers([]);
          setTriggers([]);
        }}
        width={1000}
        bodyStyle={{ maxHeight: '600px', overflowY: 'auto' }}
        footer={[
          <Button key="cancel" onClick={() => {
            setTriggersModalVisible(false);
            setTriggerModalSelectedGroup('');
            setTriggerModalSelectedTriggers([]);
            setTriggers([]);
          }}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={() => {
            setSelectedTriggers(triggerModalSelectedTriggers);
            setTriggersModalVisible(false);
            setTriggerModalSelectedGroup('');
            setTriggerModalSelectedTriggers([]);
          }}>
            Select
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 20 }}>
          <label className="spacious-label">Host</label>
          <Select
            placeholder="Select a host group"
            value={triggerModalSelectedGroup}
            onChange={(value) => {
              setTriggerModalSelectedGroup(value);
              setTriggerModalSelectedTriggers([]);
              handleGetTriggersForModal(value);
            }}
            style={{ width: '100%' }}
            options={hostGroups.map(g => ({ value: g.groupid, label: g.name }))}
          />
        </div>

        {triggerModalSelectedGroup && (
          <div>
            <label className="spacious-label">Name</label>
            <div style={{ 
              border: '1px solid #e0e0e0', 
              borderRadius: '6px',
              maxHeight: '450px', 
              overflowY: 'auto'
            }}>
              {loadingTriggers ? (
                <div style={{ textAlign: 'center', padding: '60px' }}>Loading...</div>
              ) : triggers && triggers.length > 0 ? (
                <div style={{ padding: '8px' }}>
                  {triggers.map((trigger: any, index) => (
                    <div 
                      key={trigger.triggerid}
                      style={{
                        padding: '12px',
                        borderBottom: index < triggers.length - 1 ? '1px solid #f5f5f5' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Checkbox 
                        checked={triggerModalSelectedTriggers.includes(trigger.triggerid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTriggerModalSelectedTriggers([...triggerModalSelectedTriggers, trigger.triggerid]);
                          } else {
                            setTriggerModalSelectedTriggers(triggerModalSelectedTriggers.filter(t => t !== trigger.triggerid));
                          }
                        }}
                      />
                      <span style={{ fontSize: '14px', flex: 1, color: '#2c3e50' }}>
                        {trigger.description}
                      </span>
                      {getSeverityTag(trigger.priority)}
                      {getStatusTag(trigger.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px', 
                  color: '#999', 
                  fontSize: '14px' 
                }}>
                  No triggers found
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HostFilterCard;

 