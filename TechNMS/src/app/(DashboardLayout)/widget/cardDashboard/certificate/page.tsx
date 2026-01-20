"use client";

import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { Card, Table, Progress, Spin, Tag } from "antd";

/* =====================
   CONFIG
===================== */

const HOST_ITEM_MAP: Record<"host2", string[]> = {
  host2: ["Certificate validity"],
};

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

/* =====================
   TYPES
===================== */

interface CertificateRow {
  key: string;
  status: "VALID" | "INVALID";
  count: number;
  percent: number;
}

/* =====================
   COMPONENT
===================== */

const Certificate = () => {
  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : "";

  const fetchingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [tableData, setTableData] = useState<CertificateRow[]>([]);

  /* =====================
     LOAD CERTIFICATES
  ===================== */

  const handleCertificate = async () => {
    if (!user_token || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);

    try {
      const responses = await Promise.all(
        HOST_ITEM_MAP["host2"].map((itemName) =>
          axios.post("/api/tjsb/get_item", {
            auth: user_token,
            name: itemName,
            groupids: ["210"],
          })
        )
      );

      let valid = 0;
      let invalid = 0;

      responses.forEach((res) => {
        const items = res.data?.result ?? [];
        items.forEach((item: any) => {
          const value = Number(item.lastvalue);
          if (!isNaN(value) && value > 0) invalid++;
          else valid++;
        });
      });

      const totalCount = valid + invalid;

      const rows: CertificateRow[] = [
        {
          key: "valid",
          status: "VALID",
          count: valid,
          percent: totalCount ? (valid / totalCount) * 100 : 0,
        },
        {
          key: "invalid",
          status: "INVALID",
          count: invalid,
          percent: totalCount ? (invalid / totalCount) * 100 : 0,
        },
      ];

      setTableData(rows);
      setTotal(totalCount);
    } catch (err) {
      console.error("Certificate fetch error:", err);
      setTableData([]);
      setTotal(0);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  /* =====================
     INITIAL + AUTO REFRESH
  ===================== */

  useEffect(() => {
    handleCertificate();
    intervalRef.current = setInterval(handleCertificate, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* =====================
     TABLE COLUMNS
  ===================== */

  const columns = [
    {
      title: "Status",
      dataIndex: "status",
      render: (status: "VALID" | "INVALID") => (
        <Tag color={status === "VALID" ? "green" : "red"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Count",
      dataIndex: "count",
      align: "center" as const,
    },
    {
      title: "Usage",
      dataIndex: "percent",
      render: (percent: number, record: CertificateRow) => (
        <Progress
          percent={Math.round(percent)}
          size="small"
          showInfo={false}
          strokeColor={record.status === "VALID" ? "#52c41a" : "#ff4d4f"}
        />
      ),
    },
  ];

  /* =====================
     UI
  ===================== */

  return (
    <Card
      title="Certificates"
      extra={
        <span style={{ fontSize: 14 }}>
          <b>{total}</b>{" "}
          <span style={{ color: "#8c8c8c" }}>Total Devices</span>
        </span>
      }
      style={{
        width: "100%", // Use 100% to fill parent's width
        height: "100%", // Fill parent's height to align cards vertically
        borderRadius: 18,
      }}
      bodyStyle={{ padding: 20, height: "100%" }}
    >
      {loading ? (
        <Spin />
      ) : (
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={false}
          size="large"
        />
      )}
    </Card>
  );
};

export default Certificate;
