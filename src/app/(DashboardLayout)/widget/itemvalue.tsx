"use client";

import React, { useState } from "react";
import { Form, Input, Select, Row, Col, Card } from "antd";
import type { DefaultOptionType } from "antd/es/select";

import useZabbixData from "./three";
import Itemcard from "./item_value_card/itemcard";

const ItemValue: React.FC = () => {
  const {
    hostGroups,
    hosts,
    items,
    fetchZabbixData,
  } = useZabbixData();

  /* ================= STATE ================= */
  const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
  const [selectedHostName, setSelectedHostName] = useState<string>("");

  /* ================= HANDLERS ================= */

  const handleHostGroupChange = (groupIds: string[]) => {
    fetchZabbixData("host", groupIds);
  };

  const handleHostChange = (
    hostIds: string[],
    options: DefaultOptionType | DefaultOptionType[] | undefined
  ) => {
    fetchZabbixData("item", hostIds);

    if (options) {
      const optionArray = Array.isArray(options) ? options : [options];
      if (optionArray.length > 0) {
        setSelectedHostName(String(optionArray[0].label ?? "Host"));
      }
    }
  };

  const handleItemChange = (itemIds: string[]) => {
    const selectedItems = items.filter((i) =>
      itemIds.includes(i.itemid)
    );

    const keys = selectedItems.map((i) => i.key_);
    setSelectedItemKeys(keys);
  };

  /* ================= UI ================= */

  return (
    <Form layout="vertical">

      {/* ================= ROW 1 ================= */}
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label="Name" name="name">
            <Input placeholder="default" />
          </Form.Item>
        </Col>

        <Col span={12}>
          <Form.Item label="Refresh interval" name="refresh_interval">
            <Select defaultValue="1m">
              <Select.Option value="1m">
                Default (1 minute)
              </Select.Option>
              <Select.Option value="30s">
                30 seconds
              </Select.Option>
              <Select.Option value="5m">
                5 minutes
              </Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* ================= ROW 2 ================= */}
      <Row gutter={24}>
        {/* HOST GROUP */}
        <Col span={8}>
          <Form.Item
            label="Host group"
            name="hostgroup"
            rules={[{ required: true, message: "Select host group" }]}
          >
            <Select
              mode="multiple"
              placeholder="Select host group"
              allowClear
              onChange={handleHostGroupChange}
              options={hostGroups.map((g) => ({
                label: g.name,
                value: g.groupid,
              }))}
            />
          </Form.Item>
        </Col>

        {/* HOST */}
        <Col span={8}>
          <Form.Item
            label="Host"
            name="host"
            rules={[{ required: true, message: "Select host" }]}
          >
            <Select
              mode="multiple"
              placeholder="Select host"
              allowClear
              onChange={handleHostChange}
              options={hosts.map((h) => ({
                label: h.name,
                value: h.hostid,
              }))}
            />
          </Form.Item>
        </Col>

        {/* ITEM */}
        <Col span={8}>
          <Form.Item
            label="Item"
            name="item"
            rules={[{ required: true, message: "Select item" }]}
          >
            <Select
              mode="multiple"
              placeholder="Select item"
              allowClear
              onChange={handleItemChange}
              options={items.map((i) => ({
                label: i.name,
                value: i.itemid,
              }))}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* ================= ROW 3 ================= */}
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label="Show" name="show">
            <Select
              mode="multiple"
              placeholder="Select fields"
              allowClear
            >
              <Select.Option value="description">
                Description
              </Select.Option>
              <Select.Option value="value">
                Value
              </Select.Option>
              <Select.Option value="time">
                Time
              </Select.Option>
              <Select.Option value="change">
                Change indicator
              </Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {/* ================= ITEM VALUE CARDS ================= */}
      <Card>
        <Row gutter={16}>
          {selectedItemKeys.map((key) => (
            <Col key={key}>
              <Itemcard
                hostName={selectedHostName || "Host"}
                timestamp={new Date().toLocaleString()}
                value={8.8}        
                unit="%"
                label={key}      
                trend="up"
              />
            </Col>
          ))}
        </Row>
      </Card>

    </Form>
  );
};

export default ItemValue;
