"use client";

import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { Card, Spin } from "antd";

/* =====================
   CONFIG
===================== */
const HOST_ITEM_MAP: Record<"host2", string[]> = {
  host2: ["Certificate validity"],
};

const REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes

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
  const [valid, setValid] = useState(0);
  const [invalid, setInvalid] = useState(0);

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

      let validCount = 0;
      let invalidCount = 0;

      responses.forEach((res) => {
        const items = res.data?.result ?? [];
        items.forEach((item: any) => {
          const value = Number(item.lastvalue);
          if (!isNaN(value) && value > 0) validCount++;
          else invalidCount++;
        });
      });

      setValid(validCount);
      setInvalid(invalidCount);
      setTotal(validCount + invalidCount);
    } catch (err) {
      console.error("Certificate fetch error:", err);
      setTotal(0);
      setValid(0);
      setInvalid(0);
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
     HELPERS
  ===================== */
  const pct = (v: number) => (total ? (v / total) * 100 : 0);

  /* =====================
     UI (WAN EDGE IMAGE STYLE)
  ===================== */
  return (
    <Card
      style={{
        width: 460,
        borderRadius: 18,
      }}
      bodyStyle={{ padding: "20px 22px" }}
    >
      {loading ? (
        <Spin />
      ) : (
        <>
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              Certificates
            </span>
            <span style={{ fontSize: 14 }}>
              <b>{total}</b>{" "}
              <span style={{ color: "#8c8c8c" }}>Total Devices</span>
            </span>
          </div>

          {/* TABLE HEADER */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.6fr 2fr",
              fontSize: 13,
              fontWeight: 600,
              color: "#595959",
              paddingBottom: 10,
              borderBottom: "1px solid #f0f0f0",
              marginBottom: 12,
            }}
          >
            <span>Status</span>
            <span>Count</span>
            <span>Usage</span>
          </div>

          {/* VALID ROW */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.6fr 2fr",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <span style={{ fontWeight: 500 }}>VALID</span>
            <span>{valid}</span>
            <div
              style={{
                height: 8,
                background: "#f5f5f5",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct(valid)}%`,
                  height: "100%",
                  background: "#52c41a",
                  borderRadius: 6,
                  transition: "width 500ms ease",
                }}
              />
            </div>
          </div>

          {/* INVALID ROW */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 0.6fr 2fr",
              alignItems: "center",
              padding: "10px 0",
            }}
          >
            <span style={{ fontWeight: 500 }}>INVALID</span>
            <span>{invalid}</span>
            <div
              style={{
                height: 8,
                background: "#f5f5f5",
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct(invalid)}%`,
                  height: "100%",
                  background: "#ff4d4f",
                  borderRadius: 6,
                  transition: "width 500ms ease",
                }}
              />
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

export default Certificate;
