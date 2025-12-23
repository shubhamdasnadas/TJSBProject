"use client";

import { useState } from "react";
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
} from "antd";

// =========================
// Types
// =========================
interface LatestInterface {
  ip: string;
  dns: string;
  port: string;
  type: string;
  available: string;
  active_available?: string; // NMS availability
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
  const paginationPlacement: ("topLeft" | "bottomRight")[] = [
    "topLeft",
    "bottomRight",
  ];

  // =========================
  // TYPE NAME LOGIC
  // =========================
  const getTypeName = (type: string | number) => {
    const t = Number(type);

    switch (t) {
      case 1:
        return "Zabbix Agent";
      case 2:
        return "SNMP";
      case 3:
        return "JMX";
      case 4:
        return "IPMI";
      default:
        return "Unknown";
    }
  };

  // =========================
  // AVAILABILITY LOGIC
  // =========================
  const getAvailabilityTag = (iface: LatestInterface) => {
    if (!iface) return <Tag color="default">Unknown</Tag>;

    const type = Number(iface.type);
    const available = Number(iface.available);
    const activeAvailable = Number(iface.active_available || 0);

    let status = "Unknown";
    let color: "green" | "red" | "grey" | "default" = "default";

    const typeName =
      type === 1 ? "NMS" :
        type === 2 ? "SNMP" :
          type === 3 ? "JMX" :
            type === 4 ? "IPMI" : "Unknown";

    // NMS (type=1) → active_available logic
    if (type === 1) {
      if (activeAvailable === 1) {
        status = "Available";
        color = "green";
      } else {
        status = "Not available";
        color = "red";
      }
    }

    // SNMP / JMX / IPMI → available logic
    else {
      if (available === 1) {
        status = "Available";
        color = "green";
      } else if (available === 2) {
        status = "Not available";
        color = "red";
      } else if (available === 0) {
        status = "Unknown";
        color = "grey";
      }
    }

    return <Tag color={color}>({typeName})  {status}</Tag>;
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      title: "Name",
      dataIndex: "host",
      key: "host",
    },
    {
      title: "#",
      key: "type",
      render: (_: any, record: HostItem) => (
        <span>{getTypeName(record.latest_interface?.type)}</span>
      ),
    },
    {
      title: "Members",
      key: "interface",
      render: (_: any, record: HostItem) => (
        <div>
          {record.latest_interface?.ip}:{record.latest_interface?.port}
        </div>
      ),
    },
    {
      title: "Frontend availability",
      key: "availability",
      render: (_: any, record: HostItem) =>
        getAvailabilityTag(record.latest_interface),
    },
    {
      title: "Debug mode ",
      key: "availability",
      render: (_: any, record: HostItem) =>
        getAvailabilityTag(record.latest_interface),
    },
    {
      title: "Status",
      key: "availability",
      render: (_: any, record: HostItem) =>
        getAvailabilityTag(record.latest_interface),
    },
  ];

  const data = Array.isArray(updateFilter)
    ? updateFilter.map((item: HostItem) => ({
      key: item.hostid,
      hostid: item.hostid,
      host: item.host,
      latest_interface: item.latest_interface,
      latest_ip: item.latest_ip,
    }))
    : [];

  // =========================
  // TAGS HANDLING
  // =========================
  const [tags, setTags] = useState([{ tag: "", value: "" }]);

  const addTagRow = () => setTags([...tags, { tag: "", value: "" }]);

  const updateTag = (index: number, field: "tag" | "value", value: string) => {
    const updated = [...tags];
    updated[index][field] = value;
    setTags(updated);
  };

  const removeTag = (index: number) =>
    setTags(tags.filter((_, i) => i !== index));

  return (
    <>
      <Card title="Host Filter" style={{ margin: 20 }}>
        <Form layout="vertical">

 
  
          {/* APPLY/RESET */}
          <Row justify="end" gutter={16}>
            <Col>
              <Button>Reset</Button>
            </Col>
            <Col>
              <Button type="primary" onClick={handleapply}>
                Apply
              </Button>
            </Col>
          </Row>
                    {/* Row 1 */}
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Name">
                <Input
                  placeholder="Enter name"
                  value={filterFormData.name}
                  onChange={(e) =>
                    setFilterFormData({
                      ...filterFormData,
                      name: e.target.value,
                    })
                  }
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Status">
                <Space>
                  <Button>Any</Button>
                  <Button>Enabled</Button>
                  <Button>Disabled</Button>
                </Space>
              </Form.Item>
            </Col>

 

           </Row>

        </Form>
      </Card>

     </>
  );
};

export default HostFilterCard;

