"use client";

import {
  Card,
  Input,
  Select,
  Button,
  Form,
  Row,
  Col,
  Divider,
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
  active_available?: string;
}

interface HostItem {
  hostid: string;
  host: string;       // BR-C057-KTHRD
  hostName: string;   // Zabbix name
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

import branches from "../../availability/data/data";

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
  const paginationPlacement: ("bottomRight")[] = [
  
    "bottomRight",
  ];

  // =========================
  // BRANCH NAME (USING YOUR FUNCTION)
  // =========================
  const findBranch = (hostName: string | undefined) => {
    if (!hostName) return "-";

    const match =
      branches.find(
        (b: any) =>
          hostName.includes(b.code) ||
          hostName.toLowerCase() === b.name.toLowerCase()
      ) ?? null;

    return match ? match.name : "-";
  };

  // =========================
  // TABLE COLUMNS
  // =========================
  const columns = [
    {
      title: "Host",
      dataIndex: "hostName",
      key: "hostName",
    },
    {
      title: "Branch",
      key: "branch",
      render: (_: any, record: HostItem) =>
        findBranch(record.hostName),
    },
    {
      title: "Latest Interface (IP:Port)",
      key: "interface",
      render: (_: any, record: HostItem) => (
        <span>
          {record.latest_interface?.ip ?? "-"}:
          {record.latest_interface?.port ?? "-"}
        </span>
      ),
    },
  ];

  // =========================
  // TABLE DATA
  // =========================
  const data = Array.isArray(updateFilter)
    ? updateFilter.map((item) => ({
        key: item.hostid,
        hostid: item.hostid,
        host: item.host,
        hostName: item.hostName,
        latest_interface: item.latest_interface,
        latest_ip: item.latest_ip,
      }))
    : [];

  return (
    <>
      <Card style={{ margin: 2, marginBottom: 16 }}>
        <Form layout="vertical">
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
          </Row>

          <Divider />

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

      <Table
        columns={columns}
        dataSource={data}
        pagination={{ position: paginationPlacement }}
      />
    </>
  );
};

export default HostFilterCard;
