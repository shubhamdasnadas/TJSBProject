"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Row, Col, Form, Select } from "antd";

const Graph: React.FC = () => {
    const [host_group, setHost_group] = useState<any[]>([]);
    const [host_selectData, setHost_SelectData] = useState<any[]>([]);
    const [host_data, setHost_data] = useState<any[]>([]);
    const [formData, setFormData] = useState<{ groupid: string[] }>({
        groupid: [],
    });

    const user_token =
        typeof window !== "undefined"
            ? localStorage.getItem("zabbix_auth")
            : null;

    /* ================= FETCH HOST GROUPS ================= */
    const handleGetHostGroup = async () => {
        try {
            if (!user_token) return;

            const res = await axios.post(
                "http://192.168.56.1:3000/api/api_host/api_host_group",
                {
                    auth: user_token,
                }
            );

            setHost_group(res.data.result || []);
        } catch (error) {
            console.error("Error fetching host groups", error);
        }
    };

    const handleGetHostName = async(value: any) => {
       
        try {
            if (!user_token) return;

            const res = await axios.post(
                "http://192.168.56.1:3000/api/api_host/api_get_host",
                {
                    auth: user_token,
                    groupid: value
                }
            );

            setHost_data(res.data.result || []);
        } catch (error) {
            console.error("Error fetching host groups", error);
        }
    }
    /* ================= LOAD ON MOUNT ================= */
    useEffect(() => {
        handleGetHostGroup();
    }, []);

    return (
        <div>
            <Row gutter={[24, 24]}>
                <Col span={12}>
                    <Form.Item label="Host Group">
                        <Select
                            mode="multiple"
                            placeholder="Select host groups"
                            onChange={(value) =>   handleGetHostName(value)}
                            style={{ width: "100%" }}
                        >
                            {host_group.map((v: any) => (
                                <Select.Option key={v.groupid} value={v.groupid}>
                                    {v.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Host">
                        <Select
                            mode="multiple"
                            placeholder="Select host"
                            value={formData.groupid}
                           
                            style={{ width: "100%" }}
                        >
                            {host_data.map((v: any) => (
                                <Select.Option key={v.groupid} value={v.groupid}>
                                    {v.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>
        </div>
    );
};

export default Graph;
