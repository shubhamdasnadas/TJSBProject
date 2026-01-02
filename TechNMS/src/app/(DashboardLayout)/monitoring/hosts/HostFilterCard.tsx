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
      title: "Host",
      dataIndex: "host",
      key: "host",
    },
    {
      title: "Type",
      key: "type",
      render: (_: any, record: HostItem) => (
        <span>{getTypeName(record.latest_interface?.type)}</span>
      ),
    },
    {
      title: "Latest Interface (IP:Port)",
      key: "interface",
      render: (_: any, record: HostItem) => (
        <div>
          {record.latest_interface?.ip}:{record.latest_interface?.port}
        </div>
      ),
    },
    {
      title: "Availability",
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
      <Card  style={{ margin: 2, marginBottom: 16 }}>
        <Form layout="vertical">
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
              <Form.Item label="Host groups">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="Search host groups"
                  value={filterFormData.groupid}
                  onChange={(e) =>
                    setFilterFormData({ ...filterFormData, groupid: e })
                  }
                >
                  {filterHost.map((v: any) => (
                    <Select.Option key={v.groupid} value={v.groupid}>
                      {v.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item label="IP">
                <Input placeholder="Enter IP" />
              </Form.Item>
            </Col>

            <Col span={6}>
              <Form.Item label="DNS">
                <Input placeholder="Enter DNS" />
              </Form.Item>
            </Col>
          </Row>

          {/* Row 2 */}
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Port">
                <Input placeholder="Port" />
              </Form.Item>
            </Col>

            
          </Row>

          <Divider />

          {/* Status + Tags */}
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Status">
                <Space>
                  <Button>Any</Button>
                  <Button>Enabled</Button>
                  <Button>Disabled</Button>
                </Space>
              </Form.Item>
            </Col>

            <Col span={18}>
              <Form.Item label="Tags">
                {tags.map((item, i) => (
                  <Row key={i} gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={8}>
                      <Input
                        placeholder="tag"
                        value={item.tag}
                        onChange={(e) => updateTag(i, "tag", e.target.value)}
                      />
                    </Col>

                    <Col span={8}>
                      <Input
                        placeholder="value"
                        value={item.value}
                        onChange={(e) =>
                          updateTag(i, "value", e.target.value)
                        }
                      />
                    </Col>

                    <Col span={4}>
                      <Button danger onClick={() => removeTag(i)}>
                        Remove
                      </Button>
                    </Col>
                  </Row>
                ))}

                <Button type="dashed" onClick={addTagRow}>
                  + Add Tag
                </Button>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

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
        </Form>
      </Card>

      {/* TABLE */}
      <Table
        columns={columns}
        dataSource={data}
        pagination={{ position: paginationPlacement }}
      />
    </>
  );
};

export default HostFilterCard;
