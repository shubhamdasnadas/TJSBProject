"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Radio, message } from "antd";
import { v4 as uuid } from "uuid";

import branches from "../../availability/data/data";
import axios from "axios";

export interface ColumnConfig {
  id: string;
  name: string;

  data: "Item value" | "Host Name" | "Branch Name";

  hostId: string;
  hostName: string;

  itemId?: string;
  itemName?: string;
  display?: "as_is" | "bar";
  decimals?: number;

  branchId?: string;
  branchName?: string;
  branchIp?: string;

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

  itemKey?: string;
  extraHostGroups?: string[];
  apiData?: any;
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

  existingColumns?: ColumnConfig[];

  selectedHostGroups?: string[];
}

const ColumnModal: React.FC<Props> = ({
  open,
  hosts,
  items,
  initialData,
  onHostChange,
  onCancel,
  onSubmit,
  existingColumns = [],
  selectedHostGroups = [],
}) => {
  const [form] = Form.useForm();
  const user_token = localStorage.getItem("zabbix_auth");

  const [dataType, setDataType] =
    useState<"Item value" | "Host Name" | "Branch Name">("Item value");

  const [display, setDisplay] = useState<"as_is" | "bar">("as_is");

  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialData) {
      form.setFieldsValue(initialData);
      setDataType(initialData.data);
      setDisplay(initialData.display ?? "as_is");
      setSelectedItemKey(initialData.itemKey ?? null);
      return;
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
    if (initialData) return; // disabled edit safety

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

  const handleItemChange = async (itemId: string) => {
    if (initialData) return; // don't fetch API on edit

    const item = items.find((i) => i.itemid === itemId);
    if (!item) return;

    form.setFieldsValue({
      itemId: item.itemid,
      itemName: item.name,
      itemSnapshot: { ...item },
    });

    try {
      const response = await axios.post("/api/tjsb/get_item", {
        auth: user_token,
        itemid: itemId,
      });

      const data = response.data.result;

      const key =
        Array.isArray(data) && data.length > 0 ? data[0].key_ : null;

      setSelectedItemKey(key ?? null);
    } catch (err) {
      console.error("Error fetching item details:", err);
    }
  };

  const handleBranchChange = (code: string) => {
    const branch = branches.find((b) => b.code === code);
    if (!branch) return;

    const duplicate = existingColumns.some(
      (c) =>
        c.data === "Branch Name" &&
        c.branchId === code &&
        c.id !== initialData?.id
    );

    if (duplicate) {
      message.error("This branch is already added.");
      return;
    }

    form.setFieldsValue({
      branchId: branch.code,
      branchName: branch.name,
      branchIp: branch.ip ?? "",
    });

    const relatedHost = hosts.find((h) =>
      h.name.toLowerCase().includes(branch.name.toLowerCase())
    );

    if (relatedHost) {
      handleHostChange(relatedHost.hostid);
    }
  };

  const handleSubmit = () => {
    const values = form.getFieldsValue();

    onSubmit({
      id: initialData?.id ?? uuid(),
      ...values,

      itemKey: selectedItemKey ?? initialData?.itemKey,
      extraHostGroups: selectedHostGroups,

      apiData: initialData?.apiData ?? undefined,
    });
  };

  return (
    <Modal
      title={initialData ? "Edit column" : "New column"}
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={700}
      destroyOnHidden
    >
      <Form layout="vertical" form={form}>
        <Form.Item label="Name" name="name" required>
          <Input />
        </Form.Item>

        <Form.Item label="Host" name="hostId" required>
          <Select
            showSearch
            optionFilterProp="label"
            disabled={!!initialData}
            onChange={handleHostChange}
            options={hosts.map((h) => ({
              label: h.name,
              value: h.hostid,
            }))}
          />
        </Form.Item>

        <Form.Item name="hostName" hidden />

        <Form.Item label="Data" name="data" initialValue="Item value">
          <Select onChange={(v) => setDataType(v)}>
            <Select.Option value="Item value">Item value</Select.Option>
            <Select.Option value="Host Name">Host Name</Select.Option>
            <Select.Option value="Branch Name">Branch Name</Select.Option>
          </Select>
        </Form.Item>

        {dataType === "Branch Name" && (
          <>
            <Form.Item
              label="Branch"
              name="branchId"
              rules={[{ required: true, message: "Select branch" }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                onChange={handleBranchChange}
                options={branches.map((b) => ({
                  label: `${b.name} (${b.code})`,
                  value: b.code,
                }))}
              />
            </Form.Item>

            <Form.Item name="branchName" hidden />
            <Form.Item name="branchIp" hidden />
          </>
        )}

        {dataType === "Item value" && (
          <>
            <Form.Item label="Item" name="itemId" required>
              <Select
                showSearch
                optionFilterProp="label"
                disabled={!!initialData}
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
          </>
        )}
      </Form>
    </Modal>
  );
};

export default ColumnModal;
