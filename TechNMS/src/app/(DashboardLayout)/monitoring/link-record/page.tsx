"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, SyncOutlined } from "@ant-design/icons";

const { Title } = Typography;

type TunnelInfo = {
  state?: string;
  uptime?: string;
  localColor?: string;
  remoteColor?: string;
  protocol?: string;
};

type SiteInfo = {
  hostname?: string;
  reachability?: string;
  siteState?: string; // Up/Down

  // ✅ your API may return tunnels in object OR array
  // keeping it as any to avoid breaking your existing code
  tunnels?: any;
};

type LinkRecordEntry = {
  id: number;
  createdAt: string;
  generatedAtUTC?: string | null;
  generatedAtIST?: string | null;

  systemIp: string;
  hostname: string;
  reachability: string;
  siteState: string;

  eventType?: string;

  downTunnels: Array<{
    tunnelName: string;
    localColor: string;
    remoteColor: string;
    uptime: string;
    state: string;
  }>;
};

const LinkRecord = () => {
  const [records, setRecords] = useState<LinkRecordEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const intervalRef = useRef<any>(null);

  // ✅ Normalize state
  const normalizeTunnelState = (v: any) => String(v || "").toLowerCase().trim();

  // ✅ Get all tunnels from site (Supports object + array)
  const getAllTunnels = (tunnelsObj?: any) => {
    if (!tunnelsObj) return [];

    // ✅ If tunnels is ARRAY
    if (Array.isArray(tunnelsObj)) {
      return tunnelsObj.map((t: any, idx: number) => ({
        tunnelName: t.tunnelName || String(idx),
        localColor: t.localColor || "NA",
        remoteColor: t.remoteColor || "NA",
        uptime: t.uptime || "NA",
        state: normalizeTunnelState(t.state || "NA"),
      }));
    }

    // ✅ If tunnels is OBJECT
    return Object.entries(tunnelsObj).map(([tunnelName, t]: any) => ({
      tunnelName: t.tunnelName || tunnelName,
      localColor: t.localColor || "NA",
      remoteColor: t.remoteColor || "NA",
      uptime: t.uptime || "NA",
      state: normalizeTunnelState(t.state || "NA"),
    }));
  };

  // ✅ Down tunnels list
  const getDownTunnels = (tunnelsObj?: any) => {
    return getAllTunnels(tunnelsObj).filter((t) => t.state === "down");
  };

  // ✅ ✅ NEW: For RECOVERED event show tunnel details as UP
  const getRecoveredTunnels = (tunnelsObj?: any) => {
    return getAllTunnels(tunnelsObj).map((t) => ({
      ...t,
      state: "up", // ✅ force UP for recovered display
    }));
  };

  // ✅ Is site down check
  const siteIsDown = (siteState: any, reachability: any) => {
    const s = String(siteState || "").toLowerCase();
    const r = String(reachability || "").toLowerCase();

    if (s.includes("down")) return true;
    if (r.includes("unreachable")) return true;
    return false;
  };

  // ✅ Determine current event label
  const getEventLabel = (siteState: string, downTunnelCount: number) => {
    if (siteIsDown(siteState, "")) return "SITE_DOWN";
    if (downTunnelCount > 0) return "TUNNEL_DOWN";
    return "RECOVERED"; // all tunnels up
  };

  // ✅ Render status tags
  const renderEventTag = (eventType: string) => {
    if (eventType === "SITE_DOWN") return <Tag color="red">SITE DOWN</Tag>;
    if (eventType === "TUNNEL_DOWN")
      return <Tag color="volcano">TUNNEL DOWN</Tag>;
    if (eventType === "RECOVERED") return <Tag color="green">RECOVERED</Tag>;
    return <Tag>{eventType}</Tag>;
  };

  // ✅ Fetch records (show ALL events)
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/link-records", { cache: "no-store" });
      const json = await res.json();

      if (!json.success) {
        message.error("Failed to fetch records");
        return;
      }

      setRecords(json.data || []);
    } catch (err) {
      console.error(err);
      message.error("Fetch error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Save record to API (API prevents duplicate snapshots)
  const saveLinkRecord = async (payload: any) => {
    try {
      const res = await fetch("/api/link-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json?.skipped) return;
    } catch (err) {
      console.error("Save record failed:", err);
    }
  };

  // ✅ Sync from /api/sdwan/tunnels
  const syncFromSdwan = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sdwan/tunnels", { cache: "no-store" });
      const json = await res.json();

      const sites: Record<string, SiteInfo> = json?.sites || {};
      const generatedAtUTC = json?.generatedAtUTC || null;
      const generatedAtIST = json?.generatedAtIST || null;

      for (const [systemIp, info] of Object.entries(sites)) {
        const hostname = info?.hostname || "NA";
        const reachability = info?.reachability || "NA";
        const siteState = info?.siteState || "NA";

        const downTunnels = getDownTunnels(info?.tunnels);
        const downTunnelNames = downTunnels.map((t) => t.tunnelName).sort();

        const eventType = getEventLabel(siteState, downTunnels.length);

        // ✅ For RECOVERED event -> show tunnel details also
        const tunnelsForSaving =
          eventType === "RECOVERED"
            ? getRecoveredTunnels(info?.tunnels)
            : downTunnels;

        const snapshotKey = JSON.stringify({
          siteState,
          reachability,
          downTunnelNames,
          eventType,
        });

        await saveLinkRecord({
          systemIp,
          hostname,
          reachability,
          siteState,
          downTunnels: tunnelsForSaving, // ✅ changed here
          generatedAtUTC,
          generatedAtIST,
          snapshotKey,
          eventType,
        });
      }

      await fetchRecords();
    } catch (err) {
      console.error("Sync failed:", err);
      message.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // ✅ Auto sync every 2 minutes
  useEffect(() => {
    syncFromSdwan();

    intervalRef.current = setInterval(() => {
      syncFromSdwan();
    }, 2 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ✅ Search filter
  const filteredRecords = useMemo(() => {
    if (!searchText.trim()) return records;
    const q = searchText.toLowerCase().trim();

    return records.filter((r) => {
      return (
        r.systemIp?.toLowerCase().includes(q) ||
        r.hostname?.toLowerCase().includes(q) ||
        r.reachability?.toLowerCase().includes(q) ||
        r.siteState?.toLowerCase().includes(q) ||
        (r.eventType || "")?.toLowerCase().includes(q)
      );
    });
  }, [records, searchText]);

  const columns: ColumnsType<LinkRecordEntry> = [
    {
      title: "DateTime",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 200,
      render: (v) => new Date(v).toLocaleString(),
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "descend",
    },
    {
      title: "System IP",
      dataIndex: "systemIp",
      key: "systemIp",
      width: 160,
    },
    {
      title: "Hostname",
      dataIndex: "hostname",
      key: "hostname",
      width: 230,
    },
    {
      title: "Reachability",
      dataIndex: "reachability",
      key: "reachability",
      width: 160,
    },
    {
      title: "Site State",
      dataIndex: "siteState",
      key: "siteState",
      width: 110,
      render: (v) => {
        const vv = String(v || "").toLowerCase();
        if (vv === "down") return <Tag color="red">DOWN</Tag>;
        if (vv === "up") return <Tag color="green">UP</Tag>;
        return <Tag>{String(v || "NA")}</Tag>;
      },
    },
    {
      title: "Event",
      dataIndex: "eventType",
      key: "eventType",
      width: 140,
      render: (v) => renderEventTag(String(v || "STATE_CHANGE")),
      filters: [
        { text: "TUNNEL DOWN", value: "TUNNEL_DOWN" },
        { text: "SITE DOWN", value: "SITE_DOWN" },
        { text: "RECOVERED", value: "RECOVERED" },
      ],
      onFilter: (value, record) => record.eventType === value,
    },
    {
      title: "Down Tunnels",
      key: "downTunnels",
      width: 260,
      render: (_, record) => {
        const count = record.downTunnels?.length || 0;
        return (
          <Space wrap>
            <Tag color={count > 0 ? "red" : "green"}>{count}</Tag>
            {record.downTunnels.slice(0, 2).map((t, i) => (
              <Tag key={i} color={t.state === "down" ? "volcano" : "green"}>
                {t.localColor} → {t.remoteColor}
              </Tag>
            ))}
            {count > 2 && <Tag>+{count - 2}</Tag>}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Title level={3} style={{ margin: 0 }}>
            Link Record History (UP/DOWN Transitions)
          </Title>

          <Space>
            <Button
              icon={<SyncOutlined spin={syncing} />}
              loading={syncing}
              onClick={syncFromSdwan}
              type="primary"
            >
              Sync Now
            </Button>

            <Button icon={<ReloadOutlined />} onClick={fetchRecords}>
              Refresh Table
            </Button>
          </Space>
        </div>

        <Input
          placeholder="Search by IP / Hostname / Event..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Table
          rowKey="id"
          bordered
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={filteredRecords}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                size="small"
                pagination={false}
                rowKey={(r) => r.tunnelName}
                columns={[
                  { title: "Tunnel Name", dataIndex: "tunnelName", key: "tunnelName" },
                  { title: "Local", dataIndex: "localColor", key: "localColor" },
                  { title: "Remote", dataIndex: "remoteColor", key: "remoteColor" },
                  {
                    title: "State",
                    dataIndex: "state",
                    key: "state",
                    render: (v) =>
                      String(v).toLowerCase() === "down" ? (
                        <Tag color="red">DOWN</Tag>
                      ) : (
                        <Tag color="green">UP</Tag>
                      ),
                  },
                  { title: "Uptime", dataIndex: "uptime", key: "uptime" },
                ]}
                dataSource={record.downTunnels || []}
              />
            ),
          }}
        />
      </Space>
    </div>
  );
};

export default LinkRecord;
