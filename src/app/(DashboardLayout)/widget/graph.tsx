"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Row, Col, Form, Select, Card } from "antd";

/* Recharts */
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
    Area,
    Brush,
} from "recharts";

/* ===================== TYPES ===================== */
interface RangeData {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
}

interface Props {
    rangeData?: RangeData;
    initialConfig?: any;
    onConfigChange?: (config: any) => void;
}

interface ChartPoint {
    time: string;
    value: number;
}

interface DataSet1Config {
    drawType: "line" | "points";
    strokeWidth: number;
    opacity: number;
    fill: boolean;
    yAxis: "left" | "right";
    showLegend: boolean;
    color: string;
}

const Graph: React.FC<Props> = ({
    rangeData,
    initialConfig,
    onConfigChange,
}) => {
    /* ✅ ONLY ADDITION */
    const isDashboardView = !!initialConfig;

    const [host_group, setHost_group] = useState<any[]>([]);
    const [host_data, setHost_data] = useState<any[]>([]);
    const [item_data, setItem_data] = useState<any[]>([]);
    const [chartData, setChartData] = useState<ChartPoint[]>([]);

    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [selectedHosts, setSelectedHosts] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const [dataSet1, setDataSet1] = useState<DataSet1Config>({
        drawType: "line",
        strokeWidth: 3,
        opacity: 1,
        fill: false,
        yAxis: "left",
        showLegend: true,
        color: "#1677ff",
    });

    const user_token =
        typeof window !== "undefined"
            ? localStorage.getItem("zabbix_auth")
            : null;

    /* ================= RESTORE CONFIG ================= */
    useEffect(() => {
        if (!initialConfig) return;

        setSelectedGroups(initialConfig.selectedGroups || []);
        setSelectedHosts(initialConfig.selectedHosts || []);
        setSelectedItems(initialConfig.selectedItems || []);
        setDataSet1(initialConfig.dataSet1 || dataSet1);
        setChartData(initialConfig.chartData || []);
    }, []);

    /* ================= EMIT CONFIG ================= */
    useEffect(() => {
        if (isDashboardView) return;

        onConfigChange?.({
            selectedGroups,
            selectedHosts,
            selectedItems,
            dataSet1,
            chartData,
        });
    }, [selectedGroups, selectedHosts, selectedItems, dataSet1, chartData]);
    useEffect(() => {
  if (isDashboardView) return;

  onConfigChange?.({
    chartData,
    dataSet1,
    hasData: chartData.length > 0,
  });
}, [chartData, dataSet1]);

    /* ================= DEFAULT RANGE ================= */
    const getDefaultLastOneDayRange = (): RangeData => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 86400000);

        const pad = (n: number) => String(n).padStart(2, "0");
        const d = (x: Date) =>
            `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
        const t = (x: Date) =>
            `${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;

        return {
            startDate: d(oneDayAgo),
            startTime: t(oneDayAgo),
            endDate: d(now),
            endTime: t(now),
        };
    };

    /* ================= FETCH HOST GROUPS ================= */
    const handleGetHostGroup = async () => {
        if (!user_token) return;
        const res = await axios.post("/api/api_host/api_host_group", {
            auth: user_token,
        });
        setHost_group(res.data?.result || []);
    };

    const handleGetHostName = async (groupids: string[]) => {
        setSelectedGroups(groupids);
        if (!user_token) return;

        const res = await axios.post("/api/api_host/api_get_host", {
            auth: user_token,
            groupids,
        });
        setHost_data(res.data?.result || []);
    };

    const handleGetItem = async (hostids: string[]) => {
        setSelectedHosts(hostids);
        if (!user_token) return;

        const finalRange =
            rangeData?.startDate ? rangeData : getDefaultLastOneDayRange();

        const res = await axios.post("/api/dashboard_action_log/get_item", {
            auth: user_token,
            hostids,
            ...finalRange,
        });
        setItem_data(res.data?.result || []);
    };

    const handleGetGraph = async (itemids: string[]) => {
        setSelectedItems(itemids);
        if (!user_token) return;

        const finalRange =
            rangeData?.startDate ? rangeData : getDefaultLastOneDayRange();

        const res = await axios.post("/api/dashboard_action_log/history_get", {
            auth: user_token,
            itemids,
            history: 0,
            ...finalRange,
        });

        setChartData(
            (res.data?.result || []).map((d: any) => ({
                time: new Date(Number(d.clock) * 1000).toLocaleTimeString(),
                value: Number(d.value),
            }))
        );
    };

    useEffect(() => {
        if (!isDashboardView) handleGetHostGroup();
    }, []);

    return (
        <div>
            {/* ❌ HIDE FORM IN DASHBOARD */}
            {!isDashboardView && (
                <>
                    <Row gutter={[24, 24]}>
                        <Col span={8}>
                            <Form.Item label="Host Group">
                                <Select
                                    mode="multiple"
                                    value={selectedGroups}
                                    onChange={handleGetHostName}
                                >
                                    {host_group.map((v: any) => (
                                        <Select.Option key={v.groupid} value={v.groupid}>
                                            {v.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col span={8}>
                            <Form.Item label="Host">
                                <Select
                                    mode="multiple"
                                    value={selectedHosts}
                                    onChange={handleGetItem}
                                >
                                    {host_data.map((v: any) => (
                                        <Select.Option key={v.hostid} value={v.hostid}>
                                            {v.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col span={8}>
                            <Form.Item label="Item">
                                <Select
                                    mode="multiple"
                                    value={selectedItems}
                                    onChange={handleGetGraph}
                                >
                                    {item_data.map((v: any) => (
                                        <Select.Option key={v.itemid} value={v.itemid}>
                                            {v.name}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Card title="Data set #1" style={{ marginTop: 24 }}>
                        {!isDashboardView && (
                            <Row gutter={16}>
                                <Col span={6}>
                                    <Form.Item label="Color">
                                        <Select
                                            value={dataSet1.color}
                                            onChange={(v) =>
                                                setDataSet1({ ...dataSet1, color: v })
                                            }
                                        >
                                            <Select.Option value="#1677ff">Blue</Select.Option>
                                            <Select.Option value="#52c41a">Green</Select.Option>
                                            <Select.Option value="#faad14">Orange</Select.Option>
                                            <Select.Option value="#ff4d4f">Red</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>

                                <Col span={6}>
                                    <Form.Item label="Draw">
                                        <Select
                                            value={dataSet1.drawType}
                                            onChange={(v) =>
                                                setDataSet1({ ...dataSet1, drawType: v })
                                            }
                                        >
                                            <Select.Option value="line">Line</Select.Option>
                                            <Select.Option value="points">Points</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>

                                <Col span={6}>
                                    <Form.Item label="Fill">
                                        <Select
                                            value={dataSet1.fill ? "yes" : "no"}
                                            onChange={(v) =>
                                                setDataSet1({
                                                    ...dataSet1,
                                                    fill: v === "yes",
                                                })
                                            }
                                        >
                                            <Select.Option value="yes">Yes</Select.Option>
                                            <Select.Option value="no">No</Select.Option>
                                        </Select>
                                    </Form.Item>
                                </Col>

                                <Col span={6}>
                                    <Form.Item label="Width">
                                        <Select
                                            value={dataSet1.strokeWidth}
                                            onChange={(v) =>
                                                setDataSet1({
                                                    ...dataSet1,
                                                    strokeWidth: v,
                                                })
                                            }
                                        >
                                            {[1, 2, 3, 4, 5].map((v) => (
                                                <Select.Option key={v} value={v}>
                                                    {v}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                        )}
                    </Card>
                </>
            )}

            {/* ✅ GRAPH ONLY */}
            {chartData.length > 0 && (
                <Card style={{ marginTop: 24 }}>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis />
                            <Tooltip />
                            {dataSet1.showLegend && <Legend />}

                            {dataSet1.fill && (
                                <Area
                                    dataKey="value"
                                    stroke="none"
                                    fill={dataSet1.color}
                                    fillOpacity={0.2}
                                />
                            )}

                            <Line
                                dataKey="value"
                                stroke={
                                    dataSet1.drawType === "points"
                                        ? "transparent"
                                        : dataSet1.color
                                }
                                strokeWidth={dataSet1.strokeWidth}
                                dot={{ r: 4 }}
                            />

                            <Brush dataKey="time" height={25} />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            )}
        </div>
    );
};

export default Graph;
