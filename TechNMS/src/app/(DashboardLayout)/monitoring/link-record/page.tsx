"use client";

import { useEffect, useState } from "react";
import { Card, Table, Tag, Typography } from "antd";

const AUTO_REFRESH_MS = 60 * 1000;
const { Title } = Typography;

export default function LinkRecord() {
    const [loading, setLoading] = useState(true);
    const [generatedAt, setGeneratedAt] = useState<string>("-");
    const [csvRows, setCsvRows] = useState<any[]>([]);

    async function load() {
        setLoading(true);

        try {
            // ✅ keep your tunnel API call same (it updates CSV)
            const res = await fetch("/api/sdwan/linkRecordTunnel", { cache: "no-store" });
            const json = await res.json();
            setGeneratedAt(json?.generatedAt || "-");
            console.log("log", json)
            // ✅ now frontend reads only CSV rows
            const csvRes = await fetch(`/api/sdwan/readCsv?t=${Date.now()}`, {
                cache: "no-store",
            });
            const csvJson = await csvRes.json();

            const rows = Array.isArray(csvJson?.rows) ? csvJson.rows : [];
            setCsvRows(rows);
        } catch (err) {
            console.error("FRONTEND ERROR:", err);
            setCsvRows([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        const interval = setInterval(load, AUTO_REFRESH_MS);
        return () => clearInterval(interval);
    }, []);

    const columns: any = [
        {
            title: "Last Updated",
            width: 180,
            render: (_: any, r: any) => <b>{r?.["Last Updated"] || "-"}</b>,
        },
        { title: "Branch", dataIndex: "Branch", width: 160 },
        { title: "System IP", dataIndex: "System IP", width: 140 },
        { title: "Hostname", dataIndex: "Hostname", width: 220, ellipsis: true },
        { title: "Tunnel", dataIndex: "Tunnel", width: 280, ellipsis: true },
        {
            title: "State",
            width: 120,
            render: (_: any, r: any) => {
                const state = String(r?.State || "").toUpperCase();
                if (state === "DOWN") return <Tag color="red">DOWN</Tag>;
                if (state === "PARTIAL") return <Tag color="orange">PARTIAL</Tag>;
                if (state === "UP") return <Tag color="green">UP</Tag>;
                return <Tag>{state || "-"}</Tag>;
            },
        },
        {
            title: "Type",
            width: 140,
            render: (_: any, r: any) => {
                const type = String(r?.Type || "").toUpperCase();
                if (type === "RECOVERED") return <Tag color="green">RECOVERED</Tag>;
                if (type === "CHANGED") return <Tag color="orange">CHANGED</Tag>;
                return <Tag color="blue">{type || "-"}</Tag>;
            },
        },
    ];

    return (
        <Card style={{ marginBottom: 18 }}>
            <Title level={4} style={{ marginBottom: 6 }}>
                SD-WAN Monitor
            </Title>

            <div style={{ fontWeight: 700, marginBottom: 12 }}>
                Generated At: <span style={{ color: "blue" }}>{generatedAt}</span>
            </div>

            <Table
                loading={loading}
                columns={columns}
                dataSource={csvRows}
                bordered
                pagination={false}
                rowKey={(r: any, idx?: number) =>
                    `${r?.["System IP"] || "NA"}_${r?.Tunnel || "NA"}_${r?.State || "NA"}_${r?.[
                    "Last Updated"
                    ] || "0"}_${idx ?? 0}`
                }
                size="middle"
                scroll={{ x: 1200 }}
            />
        </Card>
    );
}