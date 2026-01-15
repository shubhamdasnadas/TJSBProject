"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, Progress, Table, Tag } from "antd";
import axios from "axios";

/* ===================== TYPES ===================== */

interface ApiTriggerItem {
    severity?: string;
}

interface SeverityRow {
    key: string;
    severity: string;
    count: number;
    color: string;    // Ant Design tag color keyword
    rowColor: string; // background hex color
}

/* ===================== SEVERITY CONFIG ===================== */

// Ant Design tag colors mapped to hex codes for Progress bar strokeColor
const COLOR_HEX_MAP: Record<string, string> = {
    red: "#ff4d4f",
    volcano: "#fa541c",
    orange: "#fa8c16",
    gold: "#faad14",
    blue: "#1890ff",
};

const SEVERITY_CONFIG: Record<
    string,
    { label: string; color: string; rowColor: string }
> = {
    "5": {
        label: "Disaster",
        color: "red",
        rowColor: "#fff1f0",
    },
    "4": {
        label: "High",
        color: "volcano",
        rowColor: "#fff2e8",
    },
    "3": {
        label: "Average",
        color: "orange",
        rowColor: "#fff7e6",
    },
    "2": {
        label: "Warning",
        color: "gold",
        rowColor: "#fffbe6",
    },
    "1": {
        label: "Information",
        color: "blue",
        rowColor: "#e6f4ff",
    },
};

/* ===================== COMPONENT ===================== */

export default function ProblemsSummaryTable() {
    const user_token =
        typeof window !== "undefined"
            ? localStorage.getItem("zabbix_auth")
            : null;

    const [data, setData] = useState<SeverityRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [maxCount, setMaxCount] = useState(0); // Store max count separately
    const fetchingRef = useRef(false);

    /* ===================== FETCH & COUNT ===================== */

    const fetchProblems = async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);

        try {
            const res = await axios.post("/api/zabbix/problem_table", {
                auth: user_token,
            });

            const problems: ApiTriggerItem[] = Array.isArray(res.data?.result)
                ? res.data.result
                : [];

            // Initialize counts
            const severityCount: Record<string, number> = {
                "5": 0,
                "4": 0,
                "3": 0,
                "2": 0,
                "1": 0,
            };

            // Count by severity
            problems.forEach((problem) => {
                const sev = problem.severity;
                if (sev && severityCount[sev] !== undefined) {
                    severityCount[sev]++;
                }
            });

            // Find max count to normalize progress bars
            const max = Math.max(...Object.values(severityCount));

            // Build table data
            const tableData: SeverityRow[] = Object.entries(SEVERITY_CONFIG).map(
                ([sev, config]) => ({
                    key: sev,
                    severity: config.label,
                    color: config.color,
                    rowColor: config.rowColor,
                    count: severityCount[sev],
                })
            );

            setMaxCount(max);
            setData(tableData);
        } catch (error) {
            console.error("❌ Failed to fetch problems:", error);
            setData([]);
            setMaxCount(0);
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    };

    /* ===================== EFFECTS ===================== */

    useEffect(() => {
        fetchProblems();
        const interval = setInterval(fetchProblems, 120000); // 2 minutes
        return () => clearInterval(interval);
    }, []);

    /* ===================== TABLE COLUMNS ===================== */

    const columns = [
        {
            title: "Severity",
            dataIndex: "severity",
            render: (_: string, record: SeverityRow) => (
                <Tag color={record.color} style={{ fontWeight: 600 }}>
                    {record.severity}
                </Tag>
            ),
        },
        {
            title: "Counts",
            dataIndex: "count",
            render: (count: number) => (
                <span style={{ minWidth: 30, textAlign: "right", fontWeight: 600 }}>
                    {count}
                </span>
            )
        },
        {
            title: "Problem Count",
            dataIndex: "count",
            align: "center" as const,
            render: (count: number, record: SeverityRow) => {
                // Normalize progress bar percent based on maxCount state, avoid 0% for non-zero counts
                const percent =
                    maxCount > 0
                        ? Math.max(5, Math.round((count / maxCount) * 100))
                        : 0;

                // Use hex color for strokeColor from map, fallback to record.color string
                const strokeColor = COLOR_HEX_MAP[record.color] || record.color;

                return (
                    <>
                        <div style={{ display: "flex", gap: "10px" }}>

                            <Progress
                                percent={count === 0 ? 0 : percent}
                                size="small"
                                showInfo={false}
                                strokeColor={strokeColor}
                                status={count === 0 ? "normal" : "active"}
                            />
                        </div>
                    </>
                );
            },
        },
    ];

    /* ===================== RENDER ===================== */

    return (
        <Card
            // title="Problem Summary by Severity"
            style={{ width: 350 }}
            loading={loading && data.length === 0}
        >
            <Table
                rowKey="key"
                columns={columns}
                dataSource={data}
                pagination={false}
                size="small"
                rowClassName={() => "severity-row"}
                onRow={(record) => ({
                    style: {
                        backgroundColor: record.rowColor,
                    },
                })}
            />
        </Card>
    );
}
