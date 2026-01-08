"use client";

<<<<<<< HEAD
import React, { useEffect, useState } from "react";
=======
import React, { useEffect, useState, useRef } from "react";
>>>>>>> source/tablex
import { Form, Input, Select, Row, Col } from "antd";
import type { DefaultOptionType } from "antd/es/select";

import useZabbixData from "./three";
import Itemcard from "./item_value_card/itemcard";

/* ================= TYPES ================= */

interface ZabbixItem {
  itemid: string;
  name: string;
  key_: string;
  lastvalue?: string;
  prevvalue?: string;
  units?: string;
}

export interface ItemValueConfig {
  name?: string;
  refresh_interval?: string;
  hostgroup?: string[];
  host?: string[];
  item?: string[];
}

interface ItemValueProps {
  initialConfig?: ItemValueConfig;
  onConfigChange?: (config: ItemValueConfig) => void;
}

const ItemValue: React.FC<ItemValueProps> = ({
  initialConfig,
  onConfigChange,
}) => {
  const {
    hostGroups = [],
    hosts = [],
    items = [],
    fetchZabbixData,
  } = useZabbixData();

  const [form] = Form.useForm<ItemValueConfig>();

  const isViewMode = !!initialConfig && !onConfigChange;

  const [selectedHostName, setSelectedHostName] = useState("Host");
  const [selectedItems, setSelectedItems] = useState<ZabbixItem[]>([]);

<<<<<<< HEAD
  /* ================= INIT FROM CONFIG ================= */
  useEffect(() => {
    if (!initialConfig) return;
=======
  /* ================= EFFECT GUARDS ================= */
  const initializedRef = useRef(false);
  const itemsBuiltRef = useRef(false);
  const hostResolvedRef = useRef(false);

  /* ================= INIT FROM CONFIG (RUN ONCE) ================= */
  useEffect(() => {
    if (!initialConfig) return;
    if (initializedRef.current) return;

    initializedRef.current = true;
>>>>>>> source/tablex

    form.setFieldsValue(initialConfig);

    if (initialConfig.hostgroup?.length) {
      fetchZabbixData("host", initialConfig.hostgroup);
    }

    if (initialConfig.host?.length) {
      fetchZabbixData("item", initialConfig.host);
    }
<<<<<<< HEAD
  }, [initialConfig, fetchZabbixData, form]);

  /* ================= BUILD ITEMS AFTER FETCH ================= */
  useEffect(() => {
    if (!initialConfig?.item) return;
    if (items.length === 0) return;
=======
  }, [initialConfig]); // intentionally minimal deps

  /* ================= BUILD SELECTED ITEMS ================= */
  useEffect(() => {
    if (!initialConfig?.item) return;
    if (!items.length) return;
    if (itemsBuiltRef.current) return;

    itemsBuiltRef.current = true;
>>>>>>> source/tablex

    const selected = items.filter((i: ZabbixItem) =>
      initialConfig.item!.includes(i.itemid)
    );

    setSelectedItems(selected);
<<<<<<< HEAD
  }, [items, initialConfig]);

  /* ================= SET HOST NAME IN VIEW MODE ================= */
  useEffect(() => {
    if (!initialConfig?.host) return;
    if (hosts.length === 0) return;
=======
  }, [items]);

  /* ================= RESOLVE HOST NAME ================= */
  useEffect(() => {
    if (!initialConfig?.host) return;
    if (!hosts.length) return;
    if (hostResolvedRef.current) return;

    hostResolvedRef.current = true;
>>>>>>> source/tablex

    const host = hosts.find((h: any) =>
      initialConfig.host!.includes(h.hostid)
    );

    if (host?.name) {
      setSelectedHostName(host.name);
    }
<<<<<<< HEAD
  }, [hosts, initialConfig]);
=======
  }, [hosts]);
>>>>>>> source/tablex

  /* ================= CONFIG EMITTER ================= */
  const emitConfig = (changed: Partial<ItemValueConfig>) => {
    if (!onConfigChange) return;
    const values = form.getFieldsValue();
    onConfigChange({ ...values, ...changed });
  };

  /* ================= HANDLERS ================= */

  const handleHostGroupChange = (groupIds: string[]) => {
    fetchZabbixData("host", groupIds);
    emitConfig({ hostgroup: groupIds });
<<<<<<< HEAD
=======

    // reset dependent data
    setSelectedItems([]);
>>>>>>> source/tablex
  };

  const handleHostChange = (
    hostIds: string[],
    options?: DefaultOptionType | DefaultOptionType[]
  ) => {
    fetchZabbixData("item", hostIds);
    emitConfig({ host: hostIds });

    const optionArray = Array.isArray(options)
      ? options
      : options
      ? [options]
      : [];

    if (optionArray[0]?.label) {
      setSelectedHostName(String(optionArray[0].label));
    }
  };

  const handleItemChange = (itemIds: string[]) => {
    emitConfig({ item: itemIds });

    const selected = items.filter((i: ZabbixItem) =>
      itemIds.includes(i.itemid)
    );

    setSelectedItems(selected);
  };

  /* ================= UI ================= */

  return (
    <>
      {!isViewMode && (
        <Form layout="vertical" form={form}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="Name" name="name">
                <Input
                  placeholder="default"
<<<<<<< HEAD
                  onChange={(e) => emitConfig({ name: e.target.value })}
=======
                  onChange={(e) =>
                    emitConfig({ name: e.target.value })
                  }
>>>>>>> source/tablex
                />
              </Form.Item>
            </Col>

            <Col span={12}>
<<<<<<< HEAD
              <Form.Item label="Refresh interval" name="refresh_interval">
                <Select
                  defaultValue="1m"
                  onChange={(v) => emitConfig({ refresh_interval: v })}
                >
                  <Select.Option value="1m">Default (1 minute)</Select.Option>
                  <Select.Option value="30s">30 seconds</Select.Option>
                  <Select.Option value="5m">5 minutes</Select.Option>
=======
              <Form.Item
                label="Refresh interval"
                name="refresh_interval"
              >
                <Select
                  defaultValue="1m"
                  onChange={(v) =>
                    emitConfig({ refresh_interval: v })
                  }
                >
                  <Select.Option value="1m">
                    Default (1 minute)
                  </Select.Option>
                  <Select.Option value="30s">
                    30 seconds
                  </Select.Option>
                  <Select.Option value="5m">
                    5 minutes
                  </Select.Option>
>>>>>>> source/tablex
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={8}>
<<<<<<< HEAD
              <Form.Item label="Host group" name="hostgroup" required>
=======
              <Form.Item
                label="Host group"
                name="hostgroup"
                required
              >
>>>>>>> source/tablex
                <Select
                  mode="multiple"
                  allowClear
                  onChange={handleHostGroupChange}
                  options={hostGroups.map((g: any) => ({
                    label: g.name,
                    value: g.groupid,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="Host" name="host" required>
                <Select
                  mode="multiple"
                  allowClear
                  onChange={handleHostChange}
                  options={hosts.map((h: any) => ({
                    label: h.name,
                    value: h.hostid,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="Item" name="item" required>
                <Select
                  mode="multiple"
                  allowClear
                  onChange={handleItemChange}
                  options={items.map((i: ZabbixItem) => ({
                    label: i.name,
                    value: i.itemid,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      )}

      <Row gutter={16}>
        {selectedItems.map((item) => {
          const last = Number(item.lastvalue ?? 0);
          const prev = Number(item.prevvalue ?? last);

          return (
            <Col key={item.itemid}>
              <Itemcard
                hostName={selectedHostName}
                timestamp={new Date().toLocaleString()}
                value={last}
                unit={item.units ?? ""}
                label={item.name}
                trend={last >= prev ? "up" : "down"}
              />
            </Col>
          );
        })}
      </Row>
    </>
  );
};

export default ItemValue;
