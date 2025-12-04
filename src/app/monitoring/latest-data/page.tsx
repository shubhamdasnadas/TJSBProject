"use client";

import React, { useState } from 'react';
import {
  Button,
  Cascader,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Switch,
  TreeSelect,
  Row,
  Col,
  Space,
  Divider,
  Checkbox,
  Table,
  Empty,
} from 'antd';
import type { FormProps } from 'antd';
import BoltIcon from '/public/icons/bolt.svg';

type SizeType = Parameters<typeof Form>[0]['size'];

export default function LatestDataPage() {
  const [componentSize, setComponentSize] = useState<SizeType | 'default'>('default');
  const [form] = Form.useForm();

  const onFormLayoutChange: FormProps<any>['onValuesChange'] = ({ size }) => {
    setComponentSize(size);
  };

  const columns = [
    { title: 'Host', dataIndex: 'host', key: 'host' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Last check', dataIndex: 'lastCheck', key: 'lastCheck' },
    { title: 'Last value', dataIndex: 'lastValue', key: 'lastValue' },
    { title: 'Change', dataIndex: 'change', key: 'change' },
    { title: 'Tags', dataIndex: 'tags', key: 'tags' },
    { title: 'Info', dataIndex: 'info', key: 'info' },
  ];
  const dataSource: any[] = [];

  return (
    <div>


      <Form
        form={form}
        labelCol={{ span: 8 }}
        wrapperCol={{ span: 16 }}
        layout="vertical"
        initialValues={{ size: componentSize }}
        onValuesChange={onFormLayoutChange}
        size={componentSize as SizeType}
      >
        <Row gutter={24}>
          <Col span={12}>
            <Form.Item label="Host groups">
              <Row gutter={8}>
                <Col flex="1">
                  <Input placeholder="type here to search" />
                </Col>
                <Col>
                  <Button>Select</Button>
                </Col>
                <Form.Item label="Name">
              <Input />
            </Form.Item>
              </Row>
            </Form.Item>

            <Form.Item label="Hosts">
              <Row gutter={8}>
                <Col flex="1">
                  <Input placeholder="type here to search" />
                </Col>
                <Col>
                  <Button>Select</Button>
                </Col>
              </Row>
            </Form.Item>

            
          </Col>

          <Col span={12}>
            <Form.Item label="Tags">
              <Row align="middle" gutter={8} wrap={false}>
                <Col>
                  <Radio.Group size="small" defaultValue="and">
                    <Radio.Button value="and">And/Or</Radio.Button>
                    <Radio.Button value="or">Or</Radio.Button>
                  </Radio.Group>
                </Col>
                <Col flex="1">
                  <Input placeholder="tag" />
                </Col>
                <Col>
                  <Select defaultValue="Contains" style={{ width: 120 }}>
                    <Select.Option value="contains">Contains</Select.Option>
                    <Select.Option value="equals">Equals</Select.Option>
                    <Select.Option value="contains">Exits</Select.Option>
                    <Select.Option value="contains">Does not Contains</Select.Option>
                    <Select.Option value="contains">Does not exits</Select.Option>
                    <Select.Option value="contains">Does not Equals</Select.Option>
                  </Select>
                </Col>
                <Col flex="1">
                  <Input placeholder="value" />
                </Col>
                <Col>
                  <Button type="link">Remove</Button>
                </Col>
              </Row>
              <div style={{ marginTop: 6 }}>
                <Button type="link">Add</Button>
              </div>
            </Form.Item>

            <Form.Item label="Show tags">
              <Radio.Group defaultValue="3" buttonStyle="solid">
                <Radio.Button value="none">None</Radio.Button>
                <Radio.Button value="1">1</Radio.Button>
                <Radio.Button value="2">2</Radio.Button>
                <Radio.Button value="3">3</Radio.Button>
              </Radio.Group>
            </Form.Item>

            <Form.Item label="Tag name">
              <Radio.Group defaultValue="full" buttonStyle="solid">
                <Radio.Button value="full">Full</Radio.Button>
                <Radio.Button value="short">Shortened</Radio.Button>
                <Radio.Button value="none">None</Radio.Button>
              </Radio.Group>
            </Form.Item>
            <Form.Item label="Tag display priority">
              <Input placeholder="comma-separated list" />
            </Form.Item>
            <div style={{}}>

              <Form.Item label="State">
                <Radio.Group defaultValue="all" buttonStyle="solid">
                  <Radio.Button value="all">All</Radio.Button>
                  <Radio.Button value="normal">Normal</Radio.Button>
                  <Radio.Button value="not_supported">Not supported</Radio.Button>
                </Radio.Group>
              </Form.Item>  </div>

            <Form.Item>
              <Checkbox>Show details</Checkbox>
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Row justify="center" style={{ marginTop: 8 }} gutter={12}>
          <Col>
            <Button>Save as</Button>
          </Col>
          <Col>
            <Button type="primary" className="apply-bolt">Apply</Button>
          </Col>
          <Col>
            <Button>Reset</Button>
          </Col>
        </Row>
      </Form>

      <div style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          locale={{
            emptyText: (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 32, color: '#bfbfbf' }}>🔍</div>
                <div style={{ marginTop: 12, fontSize: 16, color: '#8c8c8c' }}>Filter is not set</div>
                <div style={{ color: '#bfbfbf' }}>Use the filter to display results</div>
              </div>
            ),
          }}
          rowKey={(record) => record.key}
          bordered
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f7f9', border: '1px solid #e8e8e8' }}>
          <div style={{ color: '#8c8c8c' }}>0 selected</div>
          <div>
            <Button style={{ marginRight: 8 }} disabled>Display stacked graph</Button>
            <Button style={{ marginRight: 8 }} disabled>Display graph</Button>
            <Button disabled>Execute now</Button>
          </div>
        </div>
      </div>
    </div>
  );
}