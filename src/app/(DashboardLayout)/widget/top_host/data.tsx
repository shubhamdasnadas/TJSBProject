"use client";

import React, { useState } from "react";
import {
  Form,
  Select,
  Row,
  Col,
  Button,
  Space,
  Table,
  Checkbox,
  Progress,
} from "antd";
import useZabbixData from "../three";
import ColumnModal, { ColumnConfig } from "./ColumnModal";

/* ================= COMPONENT ================= */
const TopHost: React.FC = () => {
  const { hostGroups, hosts, items, fetchZabbixData } = useZabbixData();
  const [form] = Form.useForm();

  const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  const [editingColumn, setEditingColumn] = useState<ColumnConfig | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState(false);

  /* ================= DERIVED ================= */

  const selectedHostNames = hosts
    .filter((h) => selectedHosts.includes(h.hostid))
    .map((h) => h.name);

  /* ================= HANDLERS ================= */

  const handleHostGroupChange = (groupIds: string[]) => {
    fetchZabbixData("host", groupIds);
    setSelectedHosts([]);
  };

  const handleHostChange = (hostIds: string[]) => {
    setSelectedHosts(hostIds);
    if (hostIds.length) fetchZabbixData("item", hostIds);
  };

  const handleSubmitColumn = (column: ColumnConfig) => {
    setColumnsConfig((prev) =>
      editingColumn
        ? prev.map((c) => (c.name === editingColumn.name ? column : c))
        : [...prev, column]
    );
    setModalOpen(false);
    setEditingColumn(null);
  };

  /* ================= PREVIEW TABLE ================= */

  const previewColumns = [
    { title: "Hostname", dataIndex: "host" },
    ...columnsConfig.map((c) => ({
      title: c.name,
      render: (_: any, row: any) => {
        if (c.data === "Host Name") return row.host;

        if (!c.itemId) return "-";

        const item = items.find((i) => i.itemid === c.itemId);
        const value = Number(item?.lastvalue ?? 0);

        if (c.display === "bar") {
          return <Progress percent={Math.min(value, 100)} size="small" />;
        }

        return `${value}${(item as any)?.units ?? ""}`;
      },
    })),
  ];

  const previewData = selectedHostNames.map((h) => ({
    key: h,
    host: h,
  }));

  /* ================= UI ================= */

  return (
    <>
      <Form layout="vertical" form={form}>
        <Row gutter={24}>
          <Col span={8}>
            <Form.Item label="Host groups">
              <Select
                mode="multiple"
                onChange={handleHostGroupChange}
                options={hostGroups.map((g) => ({
                  label: g.name,
                  value: g.groupid,
                }))}
              />
            </Form.Item>
          </Col>

          <Col span={8}>
            <Form.Item label="Hosts">
              <Select
                mode="multiple"
                value={selectedHosts}
                onChange={handleHostChange}
                options={hosts.map((h) => ({
                  label: h.name,
                  value: h.hostid,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ================= COLUMNS ================= */}
        <Form.Item label="Columns">
          <Button type="link" onClick={() => setModalOpen(true)}>
            Add
          </Button>

          <Table
            size="small"
            rowKey="name"
            pagination={false}
            dataSource={columnsConfig}
            columns={[
              { title: "Name", dataIndex: "name" },
              {
                title: "Value",
                render: (_, r: ColumnConfig) =>
                  r.data === "Host Name"
                    ? r.displayValue
                    : r.itemName,
              },
              {
                title: "Action",
                render: (_, r: ColumnConfig) => (
                  <Space>
                    <a onClick={() => { setEditingColumn(r); setModalOpen(true); }}>
                      Edit
                    </a>
                    <a onClick={() =>
                      setColumnsConfig((p) =>
                        p.filter((c) => c.name !== r.name)
                      )
                    }>
                      Remove
                    </a>
                  </Space>
                ),
              },
            ]}
          />
        </Form.Item>

        <Checkbox
          checked={preview}
          onChange={(e) => setPreview(e.target.checked)}
        >
          Show preview
        </Checkbox>
      </Form>

      {preview && (
        <Table
          style={{ marginTop: 16 }}
          bordered
          size="small"
          columns={previewColumns}
          dataSource={previewData}
        />
      )}

      <ColumnModal
        open={modalOpen}
        items={items}
        selectedHostNames={selectedHostNames}
        initialData={editingColumn}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmitColumn}
      />
    </>
  );
};

export default TopHost;
