"use client";

import React, { useState } from "react";
import {
    Card,
    Tabs,
    Form,
    Input,
    Select,
    Row,
    Col,
    Button,
    ColorPicker,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { Pie } from "@ant-design/plots";

interface DataSet {
    id: number;
    label: string;
    color: string;
}

const PieChart = () => {
    const [dataSets, setDataSets] = useState<DataSet[]>([
        { id: 1, label: "CPU", color: "#1677ff" },
        { id: 2, label: "Memory", color: "#13c2c2" },
    ]);

    const addDataSet = () => {
        const nextId = dataSets.length + 1;
        setDataSets([
            ...dataSets,
            { id: nextId, label: `Data set ${nextId}`, color: "#fa8c16" },
        ]);
    };

    /* ---------------- Preview data (synced) ---------------- */
    const previewData = dataSets.map((ds) => ({
        type: ds.label,
        value: Math.round(100 / dataSets.length),
    }));

    const pieConfig = {
        data: previewData,
        angleField: "value",
        colorField: "type",
        radius: 0.9,
        innerRadius: 0.65,
        color: dataSets.map((ds) => ds.color),

        /* 🔽 KEY SPACING FIXES 🔽 */
        padding: [0, 0, 0, 0],
        appendPadding: 0,

        legend: {
            position: "top",
            itemSpacing: 8,
        },

        label: false,
        interactions: [{ type: "element-active" }],
    };

    return (
        <div >
            <Form layout="vertical">

                <Row gutter={24} align="stretch" style={{ marginBottom: 24 }}>

                    <Col span={16}>
                        <Card
                            title="General configuration"
                            bodyStyle={{ padding: 20 }}
                            style={{ height: "100%" }}
                        >
                            <Row gutter={24} style={{ marginBottom: 16 }}>
                                <Col span={12}>
                                    <Form.Item label="Name">
                                        <Input placeholder="default" />
                                    </Form.Item>
                                </Col>

                                <Col span={12}>
                                    <Form.Item label="Refresh interval">
                                        <Select
                                            defaultValue="1m"
                                            options={[
                                                { value: "30s", label: "30 seconds" },
                                                { value: "1m", label: "1 minute" },
                                                { value: "5m", label: "5 minutes" },
                                            ]}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={24}>
                                <Col span={8}>
                                    <Form.Item label="Host pattern">
                                        <Select placeholder="Select host pattern" />
                                    </Form.Item>
                                </Col>

                                <Col span={8}>
                                    <Form.Item label="Host name">
                                        <Select placeholder="Select host name" />
                                    </Form.Item>
                                </Col>

                                <Col span={8}>
                                    <Form.Item label="Item pattern">
                                        <Select placeholder="Select item pattern" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>
                    </Col>

                    {/* -------- LIVE PREVIEW -------- */}
                    <Col span={8}>
                        <Card
                            title="Live preview"
                            bodyStyle={{
                                padding: "12px 12px 8px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "flex-start",
                            }}
                            style={{ height: "100%" }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    height: 240,
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                            >
                                <Pie {...pieConfig} />
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* ================= DATA SETS ================= */}
                <Card
                    title="Data sets"
                    bodyStyle={{ padding: 20 }}
                    extra={
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={addDataSet}
                        >
                            Add new data set
                        </Button>
                    }
                >
                    <Tabs
                        items={dataSets.map((ds) => ({
                            key: String(ds.id),
                            label: `Data set ${ds.id}`,
                            children: (
                                <Row gutter={24} style={{ paddingTop: 16 }}>
                                    <Col span={8}>
                                        <Form.Item label="Label">
                                            <Input
                                                value={ds.label}
                                                onChange={(e) =>
                                                    setDataSets((prev) =>
                                                        prev.map((d) =>
                                                            d.id === ds.id
                                                                ? { ...d, label: e.target.value }
                                                                : d
                                                        )
                                                    )
                                                }
                                            />
                                        </Form.Item>
                                    </Col>

                                    <Col span={8}>
                                        <Form.Item label="Color">
                                            <ColorPicker
                                                value={ds.color}
                                                onChange={(color) =>
                                                    setDataSets((prev) =>
                                                        prev.map((d) =>
                                                            d.id === ds.id
                                                                ? { ...d, color: color.toHexString() }
                                                                : d
                                                        )
                                                    )
                                                }
                                            />
                                        </Form.Item>
                                    </Col>

                                    <Col span={8}>
                                        <Form.Item label="Aggregation">
                                            <Select
                                                defaultValue="last"
                                                options={[
                                                    { value: "last", label: "last" },
                                                    { value: "avg", label: "avg" },
                                                    { value: "min", label: "min" },
                                                    { value: "max", label: "max" },
                                                ]}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            ),
                        }))}
                    />
                </Card>
            </Form>
        </div>
    );
};

export default PieChart;
