"use client";

import React, { useEffect } from "react";
import {
    Form,
    Input,
    Select,
    Checkbox,
    Button,
    Row,
    Col,
    Radio,
    InputNumber,
    Space,
    Divider,
} from "antd";
import axios from "axios";

const { Option } = Select;

const ActionLog: React.FC = () => {
    const [userRole, setUserRole] = React.useState<any[]>([]);
    const [actionRole, setActionRole] = React.useState<any[]>([]);
    const [mediaRole, setMediaRole] = React.useState<any[]>([]);
    const zabbix_auth = typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : null;
    const get_user_data = async () => {
        try {
            const response = await axios.post("/api/dashboard_action_log/user_get", { auth: zabbix_auth });
            const data = response.data.result;
            setUserRole(data);
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };
    const get_action_data = async () => {
        try {
            const response = await axios.post("/api/dashboard_action_log/action_get", { auth: zabbix_auth });
            const data = response.data.result;
            setActionRole(data)
            console.log("data", data)
        }
        catch (error) {
            console.error("Error fetching action data", error);
        }
    }
    const get_media_data =async() => {
        try {
            const response = await axios.post("/api/dashboard_action_log/media_get", { auth: zabbix_auth });
            const data = response.data.result;
            setMediaRole(data)
        }
        catch (error) {
            console.error("Error fetching action data", error);
        }
    }
    useEffect(() => {
        get_user_data();
        get_action_data();
        get_media_data();
    }, []);
    return (
        <Form
            layout="vertical"
            initialValues={{
                name: "default",
                refreshInterval: "1m",
                sortBy: "time_desc",
                timePeriod: "dashboard",
                showLines: 25,
            }}
        >
            {/* ================= ROW 1 ================= */}
            <Row gutter={16}>
                <Col span={16}>
                    <Form.Item label="Name" name="name">
                        <Input />
                    </Form.Item>
                </Col>

                <Col span={8}>
                    <Form.Item label="Refresh interval" name="refreshInterval">
                        <Select>
                            <Option value="1m">Default (1 minute)</Option>
                            <Option value="5m">5 minutes</Option>
                            <Option value="15m">15 minutes</Option>
                            <Option value="1h">1 hour</Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            {/* ================= ROW 2 ================= */}
            <Row gutter={16}>
                {/* ================= RECIPIENTS ================= */}
                <Col span={8}>
                    <Form.Item label="Recipients" name="recipients">
                        <Select
                            showSearch
                            mode="multiple"
                            placeholder="Select recipients"
                            optionFilterProp="label"
                            style={{ width: "100%" }}
                        >
                            {
                                userRole && userRole.map((user: any) => (
                                    <Select.Option key={user.userid} value={user.userid} label={user.alias}>
                                        {user.username}
                                    </Select.Option>
                                ))
                            }
                        </Select>
                    </Form.Item>
                </Col>

                {/* ================= ACTIONS ================= */}
                <Col span={8}>
                    <Form.Item label="Actions" name="actions">
                        <Select
                            showSearch
                            placeholder="Select actions"
                            optionFilterProp="label"
                            style={{ width: "100%" }}
                        >
                            {
                                actionRole && actionRole.map((val: any) => {
                                    return (<Select.Option key={val.mediatypeid} value={val.name}>
                                        {val.name}
                                    </Select.Option>
                                    )
                                })
                            }
                        </Select>
                    </Form.Item>
                </Col>

                {/* ================= MEDIA TYPES ================= */}
                <Col span={8}>
                    <Form.Item label="Media types" name="mediaTypes">
                        <Select
                            showSearch
                            placeholder="Select media types"
                            optionFilterProp="label"
                            style={{ width: "100%" }}
                        >
                             {
                                mediaRole && mediaRole.map((val: any) => {
                                    return (<Select.Option key={val.actionid} value={val.name}>
                                        {val.name}
                                    </Select.Option>
                                    )
                                })
                            }
                        </Select>
                    </Form.Item>
                </Col>
            </Row>


            {/* ================= ROW 3 ================= */}
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label="Status">
                        <Space direction="vertical">
                            <Checkbox>In progress</Checkbox>
                            <Checkbox>Sent / Executed</Checkbox>
                            <Checkbox>Failed</Checkbox>
                        </Space>
                    </Form.Item>
                </Col>

                <Col span={16}>
                    <Form.Item label="Search string">
                        <Input placeholder="subject or body text" />
                    </Form.Item>
                </Col>
            </Row>

            {/* ================= ROW 4 ================= */}
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item label="Time period" name="timePeriod" >
                        <Radio.Group style={{color:"#014d8c"}}>
                            <Radio.Button  value="dashboard">Dashboard</Radio.Button>
                            <Radio.Button  value="widget">Widget</Radio.Button>
                            <Radio.Button  value="custom">Custom</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                </Col>

                <Col span={8}>
                    <Form.Item label="Sort entries by" name="sortBy">
                        <Select>
                            <Option value="time_desc">Time (descending)</Option>
                            <Option value="time_asc">Time (ascending)</Option>
                        </Select>
                    </Form.Item>
                </Col>

                <Col span={8}>
                    <Form.Item
                        label="Show lines"
                        name="showLines"
                        rules={[{ type: "number", min: 1 }]}
                    >
                        <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default ActionLog;
