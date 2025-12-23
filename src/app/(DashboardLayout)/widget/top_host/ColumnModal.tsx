"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Radio } from "antd";

/* ================= TYPES ================= */
export interface ColumnConfig {
  name: string;
  data: "Item value" | "Host Name";
  itemId?: string;      // backend
  itemName?: string;    // UI
  display?: "as_is" | "bar" | "indicators";
  decimals?: number;
  aggregation?: string;
  history?: string;
  displayValue?: string; // Host Name
}

interface Item {
  itemid: string;
  name: string;
  lastvalue?: string;
  units?: string;
}

interface Props {
  open: boolean;
  items: Item[];
  selectedHostNames: string[];
  initialData?: ColumnConfig | null;
  onCancel: () => void;
  onSubmit: (column: ColumnConfig) => void;
}

/* ================= COMPONENT ================= */
const ColumnModal: React.FC<Props> = ({
  open,
  items,
  selectedHostNames,
  initialData,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [dataType, setDataType] =
    useState<"Item value" | "Host Name">("Item value");

  /* ================= PREFILL ================= */
  useEffect(() => {
    if (initialData) {
      form.setFieldsValue(initialData);
      setDataType(initialData.data);
    } else {
      form.resetFields();
      setDataType("Item value");
    }
  }, [initialData, form]);

  /* ================= ITEM SELECT ================= */
  const handleItemChange = (itemId: string) => {
    const item = items.find((i) => i.itemid === itemId);
    if (!item) return;

    form.setFieldsValue({
      itemId: item.itemid,
      itemName: item.name,
    });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = () => {
    const values = form.getFieldsValue();

    if (values.data === "Host Name") {
      onSubmit({
        name: values.name,
        data: "Host Name",
        displayValue: selectedHostNames.join(", "),
      });
      return;
    }

    onSubmit(values as ColumnConfig);
  };

  return (
    <Modal
      title={initialData ? "Edit column" : "New column"}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={650}
      destroyOnClose
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Name" name="name" required>
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
            <Form.Item label="Item name" name="itemId" required>
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

            {/* UI only */}
            <Form.Item name="itemName" hidden>
              <Input />
            </Form.Item>

            <Form.Item label="Display" name="display" initialValue="as_is">
              <Radio.Group>
                <Radio.Button value="as_is">As is</Radio.Button>
                <Radio.Button value="bar">Bar</Radio.Button>
                <Radio.Button value="indicators">Indicators</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="Decimal places" name="decimals" initialValue={2}>
              <Input type="number" min={0} />
            </Form.Item>
          </>
        )}

        {dataType === "Host Name" && (
          <Form.Item label="Selected hosts">
            <Input disabled value={selectedHostNames.join(", ")} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ColumnModal;
