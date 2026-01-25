"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, Progress, Table, Tag, Tooltip } from "antd";
import branches from "@/app/(DashboardLayout)/availability/data/data";
import axios from "axios";

/* ===================== TYPES ===================== */

interface ApiTriggerItem {
    severity?: string;
    name?: string;
    trigger?: {
        hosts?: {
            host?: string; // ✅ real hostname
            name?: string;
        }[];
    };
}

interface SeverityRow {
    key: string;
    severity: string;
    count: number;
    color: string;
    rowColor: string;
}

/* ===================== SEVERITY CONFIG ===================== */

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
    "5": { label: "Disaster", color: "red", rowColor: "#fff1f0" },
    "4": { label: "High", color: "volcano", rowColor: "#fff2e8" },
    "3": { label: "Average", color: "orange", rowColor: "#fff7e6" },
    "2": { label: "Warning", color: "gold", rowColor: "#fffbe6" },
    "1": { label: "Information", color: "blue", rowColor: "#e6f4ff" },
};

/* ===================== COMPONENT ===================== */

export default function ProblemsSummaryTable() {
    const user_token =
        typeof window !== "undefined"
            ? localStorage.getItem("zabbix_auth")
            : null;

    const [data, setData] = useState<SeverityRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [maxCount, setMaxCount] = useState(0);

    // 🔥 hostnames grouped by severity
    const [hostDetails, setHostDetails] = useState<Record<string, string[]>>(
        {}
    );

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

            const severityCount: Record<string, number> = {
                "5": 0,
                "4": 0,
                "3": 0,
                "2": 0,
                "1": 0,
            };

            const severityHosts: Record<string, Set<string>> = {
                "5": new Set(),
                "4": new Set(),
                "3": new Set(),
                "2": new Set(),
                "1": new Set(),
            };

            problems.forEach((problem) => {
                const sev = problem.severity;
                if (!sev || severityCount[sev] === undefined) return;

                severityCount[sev]++;

                // ✅ CORRECT HOSTNAME PATH
                const hostName =
                    problem.trigger?.hosts?.[0]?.host ||
                    problem.trigger?.hosts?.[0]?.name ||
                    "Unknown Host";
                const pro = problem.name
                severityHosts[sev].add(
                    `${hostName} — ${pro}`
                );
            });

            const max = Math.max(...Object.values(severityCount));

            const tableData: SeverityRow[] = Object.entries(SEVERITY_CONFIG).map(
                ([sev, cfg]) => ({
                    key: sev,
                    severity: cfg.label,
                    color: cfg.color,
                    rowColor: cfg.rowColor,
                    count: severityCount[sev],
                })
            );

            const hostData: Record<string, string[]> = {};
            Object.keys(severityHosts).forEach((sev) => {
                hostData[sev] = Array.from(severityHosts[sev]);
            });

            setMaxCount(max);
            setData(tableData);
            setHostDetails(hostData);
        } catch (error) {
            console.error("❌ Failed to fetch problems:", error);
            setData([]);
            setMaxCount(0);
            setHostDetails({});
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    };

    /* ===================== EFFECT ===================== */

    useEffect(() => {
        fetchProblems();
        const interval = setInterval(fetchProblems, 120000);
        return () => clearInterval(interval);
    }, []);

    /* ===================== TOOLTIP ===================== */

    const getBranchName = (host?: string) => {
        if (!host) return "-";
        const match = branches.find(
            (b: any) =>
                host.includes(b.code) ||
                host.toLowerCase() === b.name.toLowerCase()
        );
        return match ? match.name : "-";
    };
    const renderTooltip = (sev: string, color: string) => (
        <div
            style={{
                background: COLOR_HEX_MAP[color],
                padding: 12,
                borderRadius: 8,
                maxHeight: 260,
                overflowY: "auto",
                minWidth: 260,
            }}
        >
            {hostDetails[sev]?.map((item, i) => {
                // Split "HOST — PROBLEM"
                const [hostName, problemName] = item.split(" — ");

                return (
                    <div
                        key={i}
                        style={{
                            marginBottom: 10,
                            lineHeight: 1.4,
                        }}
                    >
                        {/* ✅ HOSTNAME IN BOLD */}
                        <div style={{ fontWeight: 600 }}>
                            {getBranchName(hostName)} - {hostName}
                        </div>

                        {/* ✅ PROBLEM NAME ON NEW LINE */}
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 400,
                                opacity: 0.95,
                            }}
                        >
                            {problemName}
                        </div>
                    </div>
                );
            })}
        </div>
    );


    /* ===================== TABLE ===================== */

    const columns = [
        {
            title: "Severity",
            dataIndex: "severity",
            render: (_: string, r: SeverityRow) => (
                <Tag color={r.color} style={{ fontWeight: 600 }}>
                    {r.severity}
                </Tag>
            ),
        },
        {
            title: "Counts",
            dataIndex: "count",
            render: (_: any, r: SeverityRow) => {
                const countNode = (
                    <span style={{ fontWeight: 600 }}>
                        {r.count}
                    </span>
                );

                // No tooltip when count is 0
                if (r.count === 0) return countNode;

                const strokeColor = COLOR_HEX_MAP[r.color] || r.color;

                return (
                    <Tooltip
                        placement="right"
                        color={strokeColor}
                        title={renderTooltip(r.key, r.color)}
                    >
                        <span style={{ cursor: "pointer" }}>
                            {countNode}
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            title: "Problem Count",
            align: "center" as const,
            render: (_: any, r: SeverityRow) => {
                const percent =
                    maxCount > 0
                        ? Math.max(5, Math.round((r.count / maxCount) * 100))
                        : 0;

                const strokeColor = COLOR_HEX_MAP[r.color] || r.color;

                const bar = (
                    <Progress
                        percent={r.count === 0 ? 0 : percent}
                        size="small"
                        showInfo={false}
                        strokeColor={strokeColor}
                        status={r.count === 0 ? "normal" : "active"}
                    />
                );

                if (r.count === 0) return bar;

                return (
                    <Tooltip
                        placement="right"
                        color={strokeColor}
                        title={renderTooltip(r.key, r.color)}
                    >
                        {bar}
                    </Tooltip>
                );
            },
        },
    ];

    /* ===================== RENDER ===================== */

    return (
        <Card
            title="Problem Summary by Severity"
            style={{ width: "100%", height: "100%" }}
            loading={loading && data.length === 0}
        >
            <Table
                rowKey="key"
                columns={columns}
                dataSource={data}
                pagination={false}
                size="small"
                onRow={(r) => ({
                    style: { backgroundColor: r.rowColor },
                })}
            />
        </Card>
    );
}
