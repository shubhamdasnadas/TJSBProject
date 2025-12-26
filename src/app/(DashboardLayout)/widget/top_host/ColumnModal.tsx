"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Radio } from "antd";
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

  // 🔑 SNAPSHOT (FIX)
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

  /* ================= PREFILL ================= */
  useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue(initialData);
      setDataType(initialData.data);
    }

    if (open && !initialData) {
      form.resetFields();
      setDataType("Item value");
    }
  }, [open, initialData, form]);

  /* ================= HANDLERS ================= */

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
      itemSnapshot: { ...item }, // 🔑 SNAPSHOT STORED
    });
  };

  const handleSubmit = () => {
    const values = form.getFieldsValue();

    onSubmit({
      id: initialData?.id ?? uuid(),
      ...values,
    });
  };

  /* ================= UI ================= */
  return (
    <Modal
      title={initialData ? "Edit column" : "New column"}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnClose
      width={650}
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
              <Radio.Group>
                <Radio.Button value="as_is">As is</Radio.Button>
                <Radio.Button value="bar">Bar</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="Decimals" name="decimals" initialValue={2}>
              <Input type="number" min={0} />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ColumnModal;
