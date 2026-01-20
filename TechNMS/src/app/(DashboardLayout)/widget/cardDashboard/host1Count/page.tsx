"use client";

import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { Card, Table, Progress, Spin, Tag } from "antd";

/* =====================
   CONFIG
===================== */

const HOST_ITEM_MAP: Record<"host1", string[]> = {
  host1: [
    'Interface ["GigabitEthernet0/0/0"]: Operational status', // PRIMARY
    'Interface ["GigabitEthernet0/0/1"]: Operational status', // SECONDARY
  ],
};

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

/* =====================
   TYPES (VERTICAL TABLE)
===================== */

interface VerticalRow {
  key: string;
  metric: "VALID" | "INVALID";
  primaryCount: number;
  primaryPercent: number;
  secondaryCount: number;
  secondaryPercent: number;
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
     LOAD & TRANSFORM DATA
  ===================== */

  const handleCertificate = async () => {
    if (!user_token || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    try {
      const responses = await Promise.all(
        HOST_ITEM_MAP["host1"].map((itemName) =>
          axios.post("/api/tjsb/get_item", {
            auth: user_token,
            name: itemName,
            groupids: ["210"],
          })
        )
      );

      let primaryValid = 0,
        primaryInvalid = 0;
      let secondaryValid = 0,
        secondaryInvalid = 0;

      // INDEX 0 = PRIMARY, INDEX 1 = SECONDARY
      responses.forEach((res, index) => {
        const items = res.data?.result ?? [];

        items.forEach((item: any) => {
          const value = Number(item.lastvalue);

          if (index === 0) {
            if (!isNaN(value) && value > 0) primaryInvalid++;
            else primaryValid++;
          } else {
            if (!isNaN(value) && value > 0) secondaryInvalid++;
            else secondaryValid++;
          }
        });
      });

      const primaryTotal = primaryValid + primaryInvalid;
      const secondaryTotal = secondaryValid + secondaryInvalid;

      const rows: VerticalRow[] = [
        {
          key: "valid",
          metric: "VALID",
          primaryCount: primaryValid,
          primaryPercent: primaryTotal
            ? (primaryValid / primaryTotal) * 100
            : 0,
          secondaryCount: secondaryValid,
          secondaryPercent: secondaryTotal
            ? (secondaryValid / secondaryTotal) * 100
            : 0,
        },
        {
          key: "invalid",
          metric: "INVALID",
          primaryCount: primaryInvalid,
          primaryPercent: primaryTotal
            ? (primaryInvalid / primaryTotal) * 100
            : 0,
          secondaryCount: secondaryInvalid,
          secondaryPercent: secondaryTotal
            ? (secondaryInvalid / secondaryTotal) * 100
            : 0,
        },
      ];

      setTableData(rows);
    } catch (err) {
      console.error("Certificate fetch error:", err);
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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* =====================
     VERTICAL TABLE COLUMNS
  ===================== */

  const columns = [
    {
      title: "Status",
      dataIndex: "metric",
      render: (status: "VALID" | "INVALID") => (
        <Tag
          color={status === "VALID" ? "green" : "red"}
          style={{ fontWeight: 700 }}
        >
          {status}
        </Tag>
      ),
    },
    {
      title: "Primary Link",
      render: (_: any, record: VerticalRow) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Count: {record.primaryCount}
          </div>
          <Progress
            percent={Math.round(record.primaryPercent)}
            size="small"
            showInfo={false}
            strokeColor={
              record.metric === "VALID" ? "#52c41a" : "#ff4d4f"
            }
          />
        </div>
      ),
    },
    {
      title: "Secondary Link",
      render: (_: any, record: VerticalRow) => (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Count: {record.secondaryCount}
          </div>
          <Progress
            percent={Math.round(record.secondaryPercent)}
            size="small"
            showInfo={false}
            strokeColor={
              record.metric === "VALID" ? "#52c41a" : "#ff4d4f"
            }
          />
        </div>
      ),
    },
  ];

  /* =====================
     UI
  ===================== */

  return (
    <Card
      title="Host-1 — Primary vs Secondary Interface Status"
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 18,
      }}
      bodyStyle={{ padding: 16 }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 20 }}>
          <Spin />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          size="large"
          bordered
          rowKey="key"
        />
      )}
    </Card>
  );
};

export default Host1Count;
