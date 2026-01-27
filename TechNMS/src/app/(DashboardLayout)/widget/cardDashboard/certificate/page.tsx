"use client";

import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { Card, Table, Progress, Spin, Tag, Tooltip } from "antd";
import branches from "@/app/(DashboardLayout)/availability/data/data";

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

interface DownInfo {
  branch: string;
  hostname: string;
  metricText: string;
}

interface CertificateRow {
  key: string;
  status: "VALID" | "INVALID";
  count: number;
  percent: number;

  // ✅ Tooltip list based on VALID / INVALID
  list?: DownInfo[];
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
     TOOLTIP HELPERS
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

  const renderTooltipList = (
    list?: DownInfo[],
    bgColor: string = "#ff4d4f"
  ) => (
    <div
      style={{
        backgroundColor: bgColor,
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
            <div style={{ fontWeight: 600 }}>
              {getBranchName(d.hostname)} - {d.hostname}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{d.metricText}</div>
          </div>
        ))
      ) : (
        <div style={{ fontSize: 12 }}>No Devices</div>
      )}
    </div>
  );

  /* =====================
     LOAD CERTIFICATE DATA
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

      // ✅ Tooltip Lists
      const validList: DownInfo[] = [];
      const invalidList: DownInfo[] = [];

      responses.forEach((res) => {
        const items = res.data?.result ?? [];

        items.forEach((item: any) => {
          const value = Number(item.lastvalue);
          const host = item.hostname;

          const info: DownInfo = {
            branch: "UNKNOWN-BRANCH",
            hostname: host || "UNKNOWN-HOST",
            metricText: `Certificate: ${item.name}`,
          };

          // ✅ Same logic: value > 0 => INVALID
          if (!isNaN(value) && value > 0) {
            invalid++;
            invalidList.push(info);
          } else {
            valid++;
            validList.push(info);
          }
        });
      });

      const totalCount = valid + invalid;

      const rows: CertificateRow[] = [
        {
          key: "valid",
          status: "VALID",
          count: valid,
          percent: totalCount ? (valid / totalCount) * 100 : 0,
          list: validList,
        },
        {
          key: "invalid",
          status: "INVALID",
          count: invalid,
          percent: totalCount ? (invalid / totalCount) * 100 : 0,
          list: invalidList,
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
        <Tag color={status === "VALID" ? "green" : "red"}>{status}</Tag>
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
      render: (percent: number, record: CertificateRow) => {
        const isInvalid = record.status === "INVALID";

        return (
          <Tooltip
            title={
              isInvalid ? renderTooltipList(record.list, "#ff4d4f") : null
            }
            placement="right"
            autoAdjustOverflow
            overlayInnerStyle={{ padding: 0, background: "transparent" }}
            overlayStyle={{ maxWidth: 420 }}
            getPopupContainer={(t) => t.parentElement!}
          >
            <div>
              {/* <div style={{ fontWeight: 600 }}>Count: {record.count}</div> */}
              <Progress
                percent={Math.round(percent)}
                size="small"
                showInfo={false}
                strokeColor={isInvalid ? "#ff4d4f" : "#52c41a"}
              />
            </div>
          </Tooltip>
        );
      },
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
        width: "100%",
        height: "100%",
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
          rowKey="key"
        />
      )}
    </Card>
  );
};

export default Certificate;
