"use client";

import { useEffect, useRef, useState } from "react";
import { Table, notification, Card, Select } from "antd";
import branches from "../../availability/data/data";
import { ISP_BRANCHES } from "../../availability/data/data";

const CACHE_KEY = "sdwan_tunnel_cache";
const TUNNEL_HISTORY_KEY = "sdwan_tunnel_history_cache";

/* ✅ NEW KEY (Only DOWN + PARTIAL tunnels history) */
const DOWN_PARTIAL_HISTORY_KEY = "sdwan_down_partial_history_cache";

const AUTO_REFRESH_MS = 60 * 1000;
const NOTIFICATION_DELAY_MS = 10000;

/* ===================== TYPES ===================== */
type IpRow = {
    hostname: string;
    systemIp: string;
    branchName: string;
    tunnels: any[];
    rowState: "up" | "down" | "partial";

    siteState?: "UP" | "DOWN";
    downtimeSec?: number;

    updatedAt?: number;
};

type TunnelHistoryItem = {
    id: string;
    systemIp: string;
    tunnelName: string;
    localColor?: string;
    state: "up" | "down" | "partial";
    uptime?: string;
    downtimeSec?: number;
    eventTime: number; // ✅ Date+Time in ms
};

/* ✅ NEW TYPE: only DOWN + PARTIAL tunnels entries */
type DownPartialHistoryItem = {
    id: string;
    systemIp: string;
    branchName: string;
    tunnelName: string;
    state: "down" | "partial";
    localColor?: string;
    uptime?: string;
    downtimeSec?: number;
    eventTime: number; // ✅ timestamp when detected
};

/* ===================== HELPERS ===================== */
function getBranchNameByHostname(hostname: string) {
    if (!hostname) return "Unknown";
    const found = branches.find((b: any) =>
        hostname.toLowerCase().includes(b.code?.toLowerCase())
    );
    return found ? found.name : "Unknown";
}

function resolveIspName(text: string) {
    if (!text) return text;
    let result = text;
    ISP_BRANCHES.forEach((isp) => {
        const type = isp.type.toLowerCase();
        if (result.toLowerCase().includes(type)) {
            result = result.replace(new RegExp(type, "gi"), isp.name);
        }
    });
    return result;
}

function getIspNameOnly(tunnel: any, suffix?: string) {
    let ispName = "";

    ISP_BRANCHES.forEach((isp) => {
        const type = isp.type.toLowerCase();
        if (tunnel?.tunnelName?.toLowerCase().includes(type)) {
            ispName = isp.name;
        }
    });

    const finalName = ispName || resolveIspName(tunnel.tunnelName);
    return suffix ? `${finalName} — ${suffix}` : finalName;
}

function formatDateTime(ms: number) {
    const d = new Date(ms);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

/* ✅ ADDED ONLY (show time only if updatedAt exists) */
function formatDateTimeOrDash(ms?: number) {
    if (!ms || ms <= 0) return "-";
    return formatDateTime(ms);
}

/* ===================== BACKGROUND COLOR ===================== */
function getBgForTunnel(tunnel: any) {
    if (!tunnel) return "#ffd6d6";
    if (tunnel.state === "down") return "#ffd6d6";
    if (tunnel.state === "up") return "#d7ffd7";
    return "#ffe5b4";
}

/* ===================== SORT HELPER ===================== */
const sortTunnels = (list: any[]) =>
    [...list].sort((a, b) => {
        const priority: any = { down: 0, partial: 1, up: 2 };
        return (priority[a.state] ?? 99) - (priority[b.state] ?? 99);
    });

/* ===================== COMPARE HELPERS ===================== */
function normalizeTunnelsForCompare(tunnels: any[]) {
    if (!Array.isArray(tunnels)) return [];
    return tunnels
        .map((t: any) => ({
            tunnelName: t?.tunnelName ?? "",
            state: t?.state ?? "",
            localColor: t?.localColor ?? "",
            remoteColor: t?.remoteColor ?? "",
        }))
        .sort((a: any, b: any) => a.tunnelName.localeCompare(b.tunnelName));
}

function hasRowChanged(prevRow?: IpRow, nextRow?: IpRow) {
    if (!prevRow || !nextRow) return true;

    if (prevRow.rowState !== nextRow.rowState) return true;

    const prevT = JSON.stringify(normalizeTunnelsForCompare(prevRow.tunnels));
    const nextT = JSON.stringify(normalizeTunnelsForCompare(nextRow.tunnels));
    if (prevT !== nextT) return true;

    if (prevRow.siteState !== nextRow.siteState) return true;
    if ((prevRow.downtimeSec ?? 0) !== (nextRow.downtimeSec ?? 0)) return true;

    return false;
}

/* ===================== JSON → TABLE ===================== */
function transformJsonToRows(json: any): IpRow[] {
    const devices = json?.sites ?? {};
    const rows: IpRow[] = [];

    Object.entries(devices).forEach(([systemIp, site]: any) => {
        const hostname = site?.hostname ?? "Unknown";
        const tunnels = Array.isArray(site?.tunnels) ? site.tunnels : [];

        let rowState: "up" | "down" | "partial" = "down";

        if (tunnels.length > 0) {
            const upCount = tunnels.filter((t: any) => t.state === "up").length;
            const downCount = tunnels.filter((t: any) => t.state === "down").length;

            if (upCount === tunnels.length) rowState = "up";
            else if (downCount === tunnels.length) rowState = "down";
            else rowState = "partial";
        }

        rows.push({
            hostname,
            systemIp,
            branchName: getBranchNameByHostname(hostname),
            tunnels,
            rowState,
            siteState: site?.siteState,
            downtimeSec: site?.downtimeSec,
        });
    });

    return rows;
}

/* ===================== COMPONENT ===================== */
export default function LinkRecord() {
    const [rows, setRows] = useState<IpRow[]>([]);
    const [loading, setLoading] = useState(true);
    const fetchingRef = useRef(false);

    const [api, contextHolder] = notification.useNotification();

    const branchNotifyRef = useRef<Record<string, boolean>>({});
    const queueRef = useRef<any[]>([]);
    const isProcessingRef = useRef(false);

    // ✅ history stored here (sessionStorage)
    const tunnelHistoryRef = useRef<TunnelHistoryItem[]>([]);

    /* ✅ NEW ARRAY (DOWN + PARTIAL with timestamps stored) */
    const downPartialHistoryRef = useRef<DownPartialHistoryItem[]>([]);

    const processQueue = () => {
        if (isProcessingRef.current) return;
        if (queueRef.current.length === 0) return;

        isProcessingRef.current = true;
        const item = queueRef.current.shift();

        api.open({
            type: "error",
            duration: 8,
            message: (
                <div style={{ fontWeight: 700 }}>
                    {item.branch} — {item.systemIp}
                </div>
            ),
            description: (
                <div>
                    {item.downTunnels.map((t: string, i: number) => (
                        <div
                            key={i}
                            style={{ color: "red", fontWeight: 600, marginBottom: 4 }}
                        >
                            • {item.systemIp}:{t}
                        </div>
                    ))}
                </div>
            ),
        });

        setTimeout(() => {
            isProcessingRef.current = false;
            processQueue();
        }, NOTIFICATION_DELAY_MS);
    };

    const formatDowntime = (seconds?: number) => {
        if (!seconds || seconds <= 0) return "NA";

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const getPartialDowntime = (current: any, list: any[]) => {
        if (!current || !Array.isArray(list)) return "NA";

        const currentIsp = resolveIspName(current.tunnelName);

        const sameIspDownTunnels = list.filter(
            (t) =>
                resolveIspName(t.tunnelName) === currentIsp &&
                t.state === "down" &&
                typeof t.downtimeSec === "number"
        );

        if (!sameIspDownTunnels.length) return "NA";

        const maxDowntime = Math.max(
            ...sameIspDownTunnels.map((t) => t.downtimeSec)
        );

        return formatDowntime(maxDowntime);
    };

    // ✅ Load cached rows + history
    useEffect(() => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                setRows(JSON.parse(cached));
                setLoading(false);
            } catch {
                sessionStorage.removeItem(CACHE_KEY);
            }
        }

        const cachedHistory = sessionStorage.getItem(TUNNEL_HISTORY_KEY);
        if (cachedHistory) {
            try {
                tunnelHistoryRef.current = JSON.parse(cachedHistory);
            } catch {
                sessionStorage.removeItem(TUNNEL_HISTORY_KEY);
            }
        }

        /* ✅ LOAD DOWN/PARTIAL history */
        const cachedDownPartial = sessionStorage.getItem(DOWN_PARTIAL_HISTORY_KEY);
        if (cachedDownPartial) {
            try {
                downPartialHistoryRef.current = JSON.parse(cachedDownPartial);
            } catch {
                sessionStorage.removeItem(DOWN_PARTIAL_HISTORY_KEY);
            }
        }
    }, []);

    const TUNNEL_DROPDOWN_WIDTH = 200;

    async function load() {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);

        try {
            const res = await fetch("/api/sdwan/tunnels");
            const json = await res.json();

            const newRowsRaw = transformJsonToRows(json);

            let prevRows: IpRow[] = [];
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    prevRows = JSON.parse(cached);
                } catch {
                    prevRows = [];
                }
            }

            const prevMap = new Map<string, IpRow>();
            prevRows.forEach((r) => prevMap.set(r.systemIp, r));

            // ✅ attach updatedAt for changed rows
            const now = Date.now();
            const newRows: IpRow[] = newRowsRaw.map((r) => {
                const prev = prevMap.get(r.systemIp);
                const changed = hasRowChanged(prev, r);

                return {
                    ...r,
                    updatedAt: changed ? now : prev?.updatedAt ?? 0,
                };
            });

            // ✅ Save tunnel history only when tunnel state changes
            newRows.forEach((row) => {
                const prevRow = prevMap.get(row.systemIp);

                const prevTunnels = prevRow?.tunnels ?? [];
                const newTunnels = row.tunnels ?? [];

                const prevTunnelMap = new Map<string, any>();
                prevTunnels.forEach((t: any) => prevTunnelMap.set(t.tunnelName, t));

                newTunnels.forEach((t: any) => {
                    const prevT = prevTunnelMap.get(t.tunnelName);

                    const prevState = prevT?.state;
                    const newState = t?.state;

                    if (!prevT || prevState !== newState) {
                        const historyItem: TunnelHistoryItem = {
                            id: `${row.systemIp}_${t.tunnelName}_${now}`,
                            systemIp: row.systemIp,
                            tunnelName: t.tunnelName,
                            localColor: t.localColor,
                            state: newState,
                            uptime: t.uptime,
                            downtimeSec: t.downtimeSec,
                            eventTime: now,
                        };

                        tunnelHistoryRef.current.unshift(historyItem);
                    }
                });
            });

            tunnelHistoryRef.current = tunnelHistoryRef.current.slice(0, 500);

            sessionStorage.setItem(
                TUNNEL_HISTORY_KEY,
                JSON.stringify(tunnelHistoryRef.current)
            );

            /* ✅ NEW LOGIC: Store ONLY DOWN + PARTIAL tunnels with timestamp */
            newRows.forEach((row) => {
                const tunnels = Array.isArray(row.tunnels) ? row.tunnels : [];

                tunnels.forEach((t: any) => {
                    if (t?.state === "down" || t?.state === "partial") {
                        const item: DownPartialHistoryItem = {
                            id: `${row.systemIp}_${t.tunnelName}_${now}`,
                            systemIp: row.systemIp,
                            branchName: row.branchName,
                            tunnelName: t.tunnelName,
                            state: t.state,
                            localColor: t.localColor,
                            uptime: t.uptime,
                            downtimeSec: t.downtimeSec,
                            eventTime: now,
                        };

                        downPartialHistoryRef.current.unshift(item);
                    }
                });
            });

            // ✅ Limit down/partial array size
            downPartialHistoryRef.current = downPartialHistoryRef.current.slice(0, 1000);

            // ✅ store down/partial array
            sessionStorage.setItem(
                DOWN_PARTIAL_HISTORY_KEY,
                JSON.stringify(downPartialHistoryRef.current)
            );

            // ✅ sort: changed row on TOP then state order
            const statePriority = { down: 0, partial: 1, up: 2 };
            newRows.sort((a, b) => {
                const timeDiff = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
                if (timeDiff !== 0) return timeDiff;
                return statePriority[a.rowState] - statePriority[b.rowState];
            });

            // ✅ notifications
            newRows.forEach((row) => {
                const key = `${row.branchName}_${row.systemIp}`;
                if (branchNotifyRef.current[key]) return;

                const downTunnels = row.tunnels.filter((t) => t.state === "down");

                if (row.tunnels.length === 0 || downTunnels.length > 0) {
                    branchNotifyRef.current[key] = true;

                    queueRef.current.push({
                        branch: row.branchName,
                        systemIp: row.systemIp,
                        downTunnels:
                            row.tunnels.length === 0
                                ? ["NA"]
                                : downTunnels.map((t) => resolveIspName(t.tunnelName)),
                    });

                    processQueue();
                }
            });

            sessionStorage.setItem(CACHE_KEY, JSON.stringify(newRows));
            setRows(newRows);
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        const interval = setInterval(load, AUTO_REFRESH_MS);
        return () => clearInterval(interval);
    }, []);

    // ✅ Get history list for Primary/Secondary dropdown (per systemIp + localColor)
    const getHistoryFor = (systemIp: string, localColor: string) => {
        return tunnelHistoryRef.current.filter(
            (h) => h.systemIp === systemIp && h.localColor === localColor
        );
    };

    /* ===================== BASE COLUMNS ===================== */
    const baseColumns: any = [
        {
            title: "Changed Time",
            width: 140,
            render: (_: any, row: IpRow) => (
                <span style={{ fontWeight: 700 }}>
                    {formatDateTimeOrDash(row.updatedAt)}
                </span>
            ),
        },
        {
            title: "Branch",
            width: 90,
            render: (_: any, row: IpRow) => {
                const map: any = {
                    up: ["#d7ffd7", "green"],
                    down: ["#ffd6d6", "red"],
                    partial: ["#ffe5b4", "orange"],
                };
                const [bg, color] = map[row.rowState];
                return (
                    <span
                        style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: bg,
                            color,
                            fontWeight: 700,
                        }}
                    >
                        {getBranchNameByHostname(row.hostname)}
                    </span>
                );
            },
        },
        {
            title: "Hostname",
            dataIndex: "hostname",
            width: 85,
            ellipsis: true,
            render: (text: string) => (
                <span style={{ fontWeight: 700 }}>{text}</span>
            ),
        },
        {
            title: "System IP",
            dataIndex: "systemIp",
            width: 65,
            render: (text: string) => (
                <span style={{ fontWeight: 700 }}>{text}</span>
            ),
        },
        {
            title: "Tunnels (Name + Uptime)",
            width: TUNNEL_DROPDOWN_WIDTH,
            ellipsis: true,
            render: (_: any, row: IpRow) => {
                const sortedTunnels =
                    row.tunnels.length > 0 ? sortTunnels(row.tunnels) : [];

                const selectedTunnel = sortedTunnels[0];
                const bg =
                    row.tunnels.length === 0 || selectedTunnel?.state === "down"
                        ? "#ffd6d6"
                        : "#d7ffd7";

                if (row.tunnels.length === 0) {
                    return (
                        <Select
                            style={{
                                width: "100%",
                                backgroundColor: "#ffd6d6",
                                border: "1px solid #000",
                                fontWeight: 700,
                            }}
                            value="NA"
                        >
                            <Select.Option value="NA">NA</Select.Option>
                        </Select>
                    );
                }

                return (
                    <Select
                        style={{
                            width: "100%",
                            backgroundColor: bg,
                            border: "1px solid #000",
                            fontWeight: 700,
                        }}
                        value={sortedTunnels[0].tunnelName}
                    >
                        {sortedTunnels.map((t: any, i: number) => (
                            <Select.Option
                                key={i}
                                value={t.tunnelName}
                                style={{ backgroundColor: getBgForTunnel(t) }}
                            >
                                {resolveIspName(t.tunnelName)} — {t.uptime}
                            </Select.Option>
                        ))}
                    </Select>
                );
            },
        },
        {
            title: "State",
            width: 45,
            ellipsis: true,
            render: (_: any, row: IpRow) => {
                const map: any = {
                    up: ["#d7ffd7", "green"],
                    down: ["#ffd6d6", "red"],
                    partial: ["#ffe5b4", "orange"],
                };
                const [bg, color] = map[row.rowState];
                return (
                    <span
                        style={{
                            padding: "2px 10px",
                            borderRadius: 6,
                            background: bg,
                            color,
                            fontWeight: 700,
                        }}
                    >
                        {row.rowState}
                    </span>
                );
            },
        },
    ];

    /* ===================== PRIMARY ===================== */
    const primaryColumn: any = {
        title: "Primary",
        width: TUNNEL_DROPDOWN_WIDTH,
        ellipsis: true,
        render: (_: any, row: IpRow) => {
            if (row.tunnels.length === 0) {
                const isDown = row.siteState === "DOWN";
                const downtimeText = isDown
                    ? `DOWN — ${formatDowntime(row.downtimeSec)}`
                    : "NA";

                return (
                    <Select
                        style={{
                            width: "100%",
                            backgroundColor: "#ffd6d6",
                            border: "1px solid #000",
                            fontWeight: 700,
                        }}
                        value={downtimeText}
                    >
                        <Select.Option value={downtimeText}>{downtimeText}</Select.Option>
                    </Select>
                );
            }

            const colorCounts: Record<string, number> = {};
            row.tunnels.forEach((t: any) => {
                colorCounts[t.localColor] = (colorCounts[t.localColor] || 0) + 1;
            });

            const primaryColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0];

            const primaryList = sortTunnels(
                row.tunnels.filter((t: any) => t.localColor === primaryColor)
            );

            const first = primaryList[0];

            const firstStatusText =
                first.state === "down"
                    ? formatDowntime(first.downtimeSec)
                    : first.state === "partial"
                        ? getPartialDowntime(first, primaryList)
                        : first.uptime;

            const historyList = getHistoryFor(row.systemIp, primaryColor);

            return (
                <Select
                    style={{
                        width: "100%",
                        backgroundColor: getBgForTunnel(first),
                        border: "1px solid #000",
                        fontWeight: 700,
                    }}
                    value={getIspNameOnly(first, firstStatusText)}
                    optionLabelProp="label"
                >
                    {historyList.length > 0 ? (
                        historyList.map((h) => {
                            const statusText =
                                h.state === "down"
                                    ? formatDowntime(h.downtimeSec)
                                    : h.state === "partial"
                                        ? "PARTIAL"
                                        : h.uptime ?? "UP";

                            const label = `${resolveIspName(h.tunnelName)} — ${h.state.toUpperCase()} — ${statusText} (${formatDateTime(
                                h.eventTime
                            )})`;

                            return (
                                <Select.Option key={h.id} value={h.id} label={label}>
                                    <span title={label}>{label}</span>
                                </Select.Option>
                            );
                        })
                    ) : (
                        primaryList.map((t: any, i: number) => {
                            const statusText =
                                t.state === "down"
                                    ? formatDowntime(t.downtimeSec)
                                    : t.state === "partial"
                                        ? getPartialDowntime(t, primaryList)
                                        : t.uptime;

                            const text = `${resolveIspName(t.tunnelName)} — ${statusText}`;

                            return (
                                <Select.Option
                                    key={i}
                                    value={t.tunnelName}
                                    label={text}
                                    style={{ backgroundColor: getBgForTunnel(t) }}
                                >
                                    {text}
                                </Select.Option>
                            );
                        })
                    )}
                </Select>
            );
        },
    };

    /* ===================== SECONDARY ===================== */
    const secondaryColumn: any = {
        title: "Secondary",
        width: TUNNEL_DROPDOWN_WIDTH,
        ellipsis: true,
        render: (_: any, row: IpRow) => {
            if (row.tunnels.length === 0) {
                const isDown = row.siteState === "DOWN";
                const downtimeText = isDown
                    ? `DOWN — ${formatDowntime(row.downtimeSec)}`
                    : "NA";

                return (
                    <Select
                        style={{
                            width: "100%",
                            backgroundColor: "#ffd6d6",
                            border: "1px solid #000",
                            fontWeight: 700,
                        }}
                        value={downtimeText}
                    >
                        <Select.Option value={downtimeText}>{downtimeText}</Select.Option>
                    </Select>
                );
            }

            const colorCounts: Record<string, number> = {};
            row.tunnels.forEach((t: any) => {
                colorCounts[t.localColor] = (colorCounts[t.localColor] || 0) + 1;
            });

            const primaryColor = Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0];

            const secondaryList = sortTunnels(
                row.tunnels.filter((t: any) => t.localColor !== primaryColor)
            );

            if (secondaryList.length === 0) {
                return (
                    <Select
                        style={{
                            width: "100%",
                            backgroundColor: "#ffffff",
                            border: "1px solid #000",
                            fontWeight: 700,
                        }}
                    />
                );
            }

            const first = secondaryList[0];

            const firstStatusText =
                first.state === "down"
                    ? formatDowntime(first.downtimeSec)
                    : first.state === "partial"
                        ? getPartialDowntime(first, secondaryList)
                        : first.uptime;

            const historyList = getHistoryFor(row.systemIp, first.localColor);

            return (
                <Select
                    style={{
                        width: "100%",
                        backgroundColor: getBgForTunnel(first),
                        border: "1px solid #000",
                        fontWeight: 700,
                    }}
                    value={getIspNameOnly(first, firstStatusText)}
                    optionLabelProp="label"
                >
                    {historyList.length > 0 ? (
                        historyList.map((h) => {
                            const statusText =
                                h.state === "down"
                                    ? formatDowntime(h.downtimeSec)
                                    : h.state === "partial"
                                        ? "PARTIAL"
                                        : h.uptime ?? "UP";

                            const label = `${resolveIspName(h.tunnelName)} — ${h.state.toUpperCase()} — ${statusText} (${formatDateTime(
                                h.eventTime
                            )})`;

                            return (
                                <Select.Option key={h.id} value={h.id} label={label}>
                                    <span title={label}>{label}</span>
                                </Select.Option>
                            );
                        })
                    ) : (
                        secondaryList.map((t: any, i: number) => {
                            const statusText =
                                t.state === "down"
                                    ? formatDowntime(t.downtimeSec)
                                    : t.state === "partial"
                                        ? getPartialDowntime(t, secondaryList)
                                        : t.uptime;

                            const text = `${resolveIspName(t.tunnelName)} — ${statusText}`;

                            return (
                                <Select.Option
                                    key={i}
                                    value={t.tunnelName}
                                    label={text}
                                    style={{ backgroundColor: getBgForTunnel(t) }}
                                >
                                    {text}
                                </Select.Option>
                            );
                        })
                    )}
                </Select>
            );
        },
    };

    const FIXED_FIRST_TABLE_IPS = [
        "192.168.222.1",
        "192.168.222.2",
        "192.168.222.3",
        "192.168.222.4",
    ];

    const table1Rows = rows.filter((r) => FIXED_FIRST_TABLE_IPS.includes(r.systemIp));
    const table2Rows = rows.filter((r) => !FIXED_FIRST_TABLE_IPS.includes(r.systemIp));

    const table2Columns = [
        ...baseColumns.filter(
            (col: any) =>
                col.title !== "Tunnels (Name + Uptime)" && col.title !== "State"
        ),
        primaryColumn,
        secondaryColumn,
        baseColumns.find((col: any) => col.title === "State"),
    ];

    return (
        <>
            {contextHolder}

            {table2Rows.length > 0 && (
                <Card>
                    <h2>SD-WAN IPsec Tunnels Status - Branches</h2>
                    <Table
                        loading={loading}
                        columns={table2Columns}
                        dataSource={table2Rows}
                        bordered
                        pagination={false}
                        rowKey={(r) => r.systemIp}
                        size="middle"
                        showHeader={true}
                    />
                </Card>
            )}

            <Card style={{ marginBottom: 20 }}>
                <h2>SD-WAN IPsec Tunnels Status - Data Center</h2>
                <Table
                    loading={loading}
                    columns={baseColumns}
                    dataSource={table1Rows}
                    bordered
                    pagination={false}
                    rowKey={(r) => r.systemIp}
                    size="middle"
                    showHeader={true}
                />
            </Card>
        </>
    );
}
