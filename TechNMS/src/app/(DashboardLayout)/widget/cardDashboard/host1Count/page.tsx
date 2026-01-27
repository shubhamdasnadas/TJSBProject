"use client";

import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  Table,
  Progress,
  Spin,
  Tag,
  Tooltip,
} from "antd";
import branches from "@/app/(DashboardLayout)/availability/data/data";
/* =====================
   CONFIG
===================== */

const HOST_ITEM_MAP: Record<"host1", string[]> = {
  host1: [
    'Interface ["GigabitEthernet0/0/0"]: Operational status',
    'Interface ["GigabitEthernet0/0/1"]: Operational status',
  ],
};

const REFRESH_INTERVAL = 2 * 60 * 1000;

/* =====================
   TYPES
===================== */

interface DownInfo {
  branch: string;
  hostname: string;
  metricText: string;
}

interface VerticalRow {
  key: string;
  metric: "UP" | "DOWN";
  primaryCount: number;
  primaryPercent: number;
  secondaryCount: number;
  secondaryPercent: number;
  primaryDownList?: DownInfo[];
  secondaryDownList?: DownInfo[];
}

/* =====================
   COMPONENT
===================== */

const Host1Count = () => {
  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : "";

  const fetchingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [tableData, setTableData] = useState<VerticalRow[]>([]);

  /* =====================
     LOAD DATA
  ===================== */

  const handleCertificate = async () => {
    if (!user_token || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    try {
      const responses = await Promise.all(
        HOST_ITEM_MAP.host1.map((itemName) =>
          axios.post("/api/tjsb/get_item", {
            auth: user_token,
            name: itemName,
            groupids: ["210"],
          })
        )
      );

      let primaryUp = 0,
        primaryDown = 0;
      let secondaryUp = 0,
        secondaryDown = 0;

      const primaryDownList: DownInfo[] = [];
      const secondaryDownList: DownInfo[] = [];

      responses.forEach((res, index) => {
        const items = res.data?.result ?? [];
        console.log("res", res);
        items.forEach((item: any) => {
          const value = Number(item.lastvalue);
          const host = item.hostname;

          // ✅ PROPER downInfo
          const downInfo: DownInfo = {
            branch: "UNKNOWN-BRANCH",
            hostname: host || "UNKNOWN-HOST",
            metricText: `Cisco SD-WAN: ${item.name}`,
          };

          if (index === 0) {
            if (!isNaN(value) && value > 0) {
              primaryDown++;
              primaryDownList.push(downInfo);
            } else {
              primaryUp++;
            }
          } else {
            if (!isNaN(value) && value > 0) {
              secondaryDown++;
              secondaryDownList.push(downInfo);
            } else {
              secondaryUp++;
            }
          }
        });
      });

      const primaryTotal = primaryUp + primaryDown;
      const secondaryTotal = secondaryUp + secondaryDown;

      setTableData([
        {
          key: "up",
          metric: "UP",
          primaryCount: primaryUp,
          primaryPercent: primaryTotal
            ? (primaryUp / primaryTotal) * 100
            : 0,
          secondaryCount: secondaryUp,
          secondaryPercent: secondaryTotal
            ? (secondaryUp / secondaryTotal) * 100
            : 0,
        },
        {
          key: "down",
          metric: "DOWN",
          primaryCount: primaryDown,
          primaryPercent: primaryTotal
            ? (primaryDown / primaryTotal) * 100
            : 0,
          secondaryCount: secondaryDown,
          secondaryPercent: secondaryTotal
            ? (secondaryDown / secondaryTotal) * 100
            : 0,
          primaryDownList,
          secondaryDownList,
        },
      ]);
    } catch (err) {
      console.error("Host1Count fetch error:", err);
      setTableData([]);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  /* =====================
     AUTO REFRESH
  ===================== */

  useEffect(() => {
    handleCertificate();
    intervalRef.current = setInterval(handleCertificate, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  /* =====================
     TOOLTIP UI
  ===================== */

  const getBranchName = (host?: string) => {
    if (!host) return "-";
    const match = branches.find(
      (b: any) =>
        host.includes(b.code) ||
        host.toLowerCase() === b.name.toLowerCase()
    );
    return match ? match.name : "-";
  };
  const renderDownTooltip = (list?: DownInfo[]) => (
    <div
      style={{
        backgroundColor: "#ff4d4f",
        color: "#fff",
        padding: "12px 14px",
        borderRadius: 8,
        width: 420,
        maxHeight: 260,
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
      {list?.length ? (
        list.map((d, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              paddingBottom: 10,
              borderBottom: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            {/* <div style={{ fontWeight: 700 }}>{d.branch}</div> */}
            {/* <div style={{ fontSize: 12, opacity: 0.9 }}>
              {d.hostname}
            </div> */}
            <div style={{ fontWeight: 600 }}>
              {getBranchName(d.hostname)} - {d.hostname}
            </div>
          </div>
        ))
      ) : (
        <div style={{ fontSize: 12 }}>No DOWN interfaces</div>
      )}
    </div>
  );

  /* =====================
     TABLE COLUMNS
  ===================== */

  const columns = [
    {
      title: "Status",
      dataIndex: "metric",
      render: (s: "UP" | "DOWN") => (
        <Tag color={s === "UP" ? "green" : "red"}>{s}</Tag>
      ),
    },
    {
      title: "Primary Port",
      render: (_: any, r: VerticalRow) => (
        <Tooltip
          title={r.metric === "DOWN" ? renderDownTooltip(r.primaryDownList) : null}
          placement="right"
          autoAdjustOverflow
          overlayInnerStyle={{ padding: 0, background: "transparent" }}
          overlayStyle={{ maxWidth: 420 }}
          getPopupContainer={(t) => t.parentElement!}
        >
          <div>
            <div style={{ fontWeight: 600 }}>
              Count: {r.primaryCount}
            </div>
            <Progress
              percent={Math.round(r.primaryPercent)}
              showInfo={false}
              strokeColor={r.metric === "DOWN" ? "#ff4d4f" : "#52c41a"}
            />
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Secondary Port",
      render: (_: any, r: VerticalRow) => (
        <Tooltip
          title={
            r.metric === "DOWN"
              ? renderDownTooltip(r.secondaryDownList)
              : null
          }
          placement="right"
          autoAdjustOverflow
          overlayInnerStyle={{ padding: 0, background: "transparent" }}
          overlayStyle={{ maxWidth: 420 }}
          getPopupContainer={(t) => t.parentElement!}
        >
          <div>
            <div style={{ fontWeight: 600 }}>
              Count: {r.secondaryCount}
            </div>
            <Progress
              percent={Math.round(r.secondaryPercent)}
              showInfo={false}
              strokeColor={r.metric === "DOWN" ? "#ff4d4f" : "#52c41a"}
            />
          </div>
        </Tooltip>
      ),
    },
  ];

  /* =====================
     UI
  ===================== */

  return (
    <Card
      title="Primary & Secondary Interface Status"
      style={{ width: "100%", borderRadius: 18 }}
    >
      {loading ? (
        <Spin />
      ) : (
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          bordered
          rowKey="key"
        />
      )}
    </Card>
  );
};

export default Host1Count;
