"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Radio, Row, Col } from "antd";
import { v4 as uuid } from "uuid";

/* ================= TYPES ================= */
export interface ColumnConfig {
  id: string;
  name: string;
  data: "Item value" | "Host Name";
  hostId: string;
  hostName: string;

  itemId?: string;
  itemName?: string;
  display?: "as_is" | "bar";
  decimals?: number;

  thresholds?: {
    from: number;
    to: number;
    color: string;
  }[];

  itemSnapshot?: {
    itemid: string;
    name: string;
    lastvalue?: string;
    units?: string;
  };
}

interface Host {
  hostid: string;
  name: string;
}

interface Item {
  itemid: string;
  name: string;
  lastvalue?: string;
  units?: string;
}

interface Props {
  open: boolean;
  hosts: Host[];
  items: Item[];
  initialData?: ColumnConfig | null;
  onHostChange?: (hostId: string) => void;
  onCancel: () => void;
  onSubmit: (column: ColumnConfig) => void;
}

/* ================= COMPONENT ================= */
const ColumnModal: React.FC<Props> = ({
  open,
  hosts,
  items,
  initialData,
  onHostChange,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [dataType, setDataType] =
    useState<"Item value" | "Host Name">("Item value");
  const [display, setDisplay] = useState<"as_is" | "bar">("as_is");

  useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue(initialData);
      setDataType(initialData.data);
      setDisplay(initialData.display ?? "as_is");
    }

    if (open && !initialData) {
      form.resetFields();
      setDataType("Item value");
      setDisplay("as_is");
      form.setFieldsValue({
        thresholds: [
          { from: 0, to: 30, color: "#52c41a" },
          { from: 31, to: 70, color: "#faad14" },
          { from: 71, to: 100, color: "#ff4d4f" },
        ],
      });
    }
  }, [open, initialData, form]);

  const handleHostChange = (hostId: string) => {
    const host = hosts.find((h) => h.hostid === hostId);
    if (!host) return;

    onHostChange?.(hostId);

    form.setFieldsValue({
      hostId,
      hostName: host.name,
      itemId: undefined,
      itemName: undefined,
      itemSnapshot: undefined,
    });
  };

  const handleItemChange = (itemId: string) => {
    const item = items.find((i) => i.itemid === itemId);
    if (!item) return;

    form.setFieldsValue({
      itemId: item.itemid,
      itemName: item.name,
      itemSnapshot: { ...item },
    });
  };

  const handleSubmit = () => {
    const values = form.getFieldsValue();
    onSubmit({
      id: initialData?.id ?? uuid(),
      ...values,
    });
  };

  return (
    <Modal
      title={initialData ? "Edit column" : "New column"}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={700}
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Name" name="name" required>
          <Input />
        </Form.Item>

        <Form.Item label="Host" name="hostId" required>
          <Select
            showSearch
            optionFilterProp="label"
            onChange={handleHostChange}
            options={hosts.map((h) => ({
              label: h.name,
              value: h.hostid,
            }))}
          />
        </Form.Item>

        <Form.Item name="hostName" hidden>
          <Input />
        </Form.Item>

        <Form.Item label="Data" name="data" initialValue="Item value">
          <Select onChange={(v) => setDataType(v)}>
            <Select.Option value="Item value">Item value</Select.Option>
            <Select.Option value="Host Name">Host Name</Select.Option>
          </Select>
        </Form.Item>

        {dataType === "Item value" && (
          <>
            <Form.Item label="Item" name="itemId" required>
              <Select
                showSearch
                optionFilterProp="label"
                onChange={handleItemChange}
                options={items.map((i) => ({
                  label: i.name,
                  value: i.itemid,
                }))}
              />
            </Form.Item>

            <Form.Item name="itemName" hidden />
            <Form.Item name="itemSnapshot" hidden />

            <Form.Item label="Display" name="display" initialValue="as_is">
              <Radio.Group onChange={(e) => setDisplay(e.target.value)}>
                <Radio.Button value="as_is">As is</Radio.Button>
                <Radio.Button value="bar">Bar</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="Decimals" name="decimals" initialValue={2}>
              <Input type="number" min={0} />
            </Form.Item>

            {display === "bar" && (
              <>
                <h4>Thresholds</h4>

                <Form.List name="thresholds">
                  {(fields) =>
                    fields.map((field, idx) => (
                      <Row gutter={8} key={idx}>
                        <Col span={6}>
                          <Form.Item
                            label="From"
                            name={[field.name, "from"]}
                          >
                            <Input type="number" />
                          </Form.Item>
                        </Col>

                        <Col span={6}>
                          <Form.Item label="To" name={[field.name, "to"]}>
                            <Input type="number" />
                          </Form.Item>
                        </Col>

                        <Col span={8}>
                          <Form.Item
                            label="Color"
                            name={[field.name, "color"]}
                          >
                            <Input type="color" />
                          </Form.Item>
                        </Col>
                      </Row>
                    ))
                  }
                </Form.List>
              </>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ColumnModal;
