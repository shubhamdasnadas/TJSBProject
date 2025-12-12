"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { Table, Typography } from "antd";

const { Text } = Typography;

const colors: Record<string, string> = {
    disaster: "144,238,144",
    high: "211,211,211",
    average: "255,204,128",
    warning: "255,245,157",
    information: "173,216,230",
    not_classified: "255,179,179",
};

export default function ProblemSeverity() {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const token =
        typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : "";

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await axios.post(
                    "http://192.168.56.1:3000/api/zabbix/problems",
                    { auth: token }
                );

                const triggers = Array.isArray(res.data?.result)
                    ? res.data.result
                    : [];

                const map: any = {};
                const pri: any = {
                    5: "disaster",
                    4: "high",
                    3: "average",
                    2: "warning",
                    1: "information",
                };

                triggers.forEach((t: any) =>
                    t.groups.forEach((g: any) => {
                        map[g.name] ??= {
                            disaster: 0,
                            high: 0,
                            average: 0,
                            warning: 0,
                            information: 0,
                            not_classified: 0,
                        };
                        const k = pri[t.priority] || "not_classified";
                        map[g.name][k]++;
                    })
                );

                setRows(
                    Object.entries(map).map(([group, v]: any) => ({
                        key: group,
                        group,
                        ...v,
                    }))
                );
            } finally {
                setLoading(false);
            }
        };

        // 🔥 Call immediately on first load
        load();

        // 🔄 Auto-refresh every 1 minute (60,000 milliseconds)
        const interval = setInterval(() => {
            console.log("🔄 Auto-refreshing severity table...");
            load();
        }, 60000);

        // 🧹 Cleanup the interval on unmount
        return () => clearInterval(interval);

    }, [token]);

    const Cell = (value: number, severity: string, record: any) => {
        const total =
            record.disaster +
            record.high +
            record.average +
            record.warning +
            record.information +
            record.not_classified;

        if (!value || !total) return <div style={{ height: 34 }} />;

        const opacity = Math.max(0.25, value / total);

        return (
            <div
                style={{
                    background: `rgba(${colors[severity]}, ${opacity})`,
                    height: 34,
                    lineHeight: "34px",
                    textAlign: "center",
                    fontWeight: 600,
                    width: "100%",
                }}
            >
                {value}
            </div>
        );
    };

    const makeCol = (title: string, key: string) => ({
        title,
        dataIndex: key,
        render: (_: any, r: any) => Cell(r[key], key, r),
    });

    const columns = [
        {
            title: "Host Group",
            dataIndex: "group",
            width: 180,
            render: (t: string) => (
                <Text strong style={{ textAlign: "center", display: "block" }}>{t}</Text>
            ),
        },
        makeCol("Disaster", "disaster"),
        makeCol("High", "high"),
        makeCol("Average", "average"),
        makeCol("Warning", "warning"),
        makeCol("Information", "information"),
 
    ];

    return (
        <>
            <Table
                columns={columns}
                dataSource={rows}
                loading={loading}
                pagination={false}
                bordered
                size="small"
                className="sev-table"
                scroll={{ x: true }}
                tableLayout="fixed"
                style={{ marginTop: "20px" }}
            />
            <style jsx global>{`
        .sev-table .ant-table,
        .sev-table .ant-table-container,
        .sev-table .ant-table-content {
          background: white !important;
        }

        /* Fix header misalignment */
        .sev-table .ant-table-thead > tr > th {
          padding: 10px !important;
          height: 40px !important;
          line-height: 40px !important;
          background: #fafafa !important;
          font-weight: 600;
          font-size: 13px;
          text-align: center;
          border-bottom: 2px solid #e5e5e5 !important;
        }

        .sev-table .ant-table-tbody > tr > td {
          padding: 0 !important;
          border-color: #f0f0f0 !important;
        }

        .sev-table .ant-table-container {
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e5e7eb !important;
        }

        .sev-table table {
          table-layout: fixed !important;
        }
      `}</style>
        </>
    );
}
