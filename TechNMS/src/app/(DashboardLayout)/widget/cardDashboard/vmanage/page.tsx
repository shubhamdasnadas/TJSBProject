"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, Spin, Table } from "antd";

/* =====================
   CONSTANTS
===================== */
const CACHE_KEY = "sdwan_tunnel_cache_summary";
const REFRESH_INTERVAL = 2 * 60 * 1000;
const BAR_ANIM_DELAY = 250;
const COUNT_ANIM_DURATION = 800;

/* ======= HUB IPs (TABLE-1) ======= */
const TABLE1_IPS = new Set([
  "192.168.222.1",
  "192.168.222.2",
  "192.168.222.3",
  "192.168.222.4",
]);

/* =====================
   COUNT-UP COMPONENT
===================== */
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(value / (COUNT_ANIM_DURATION / 16)));

    const interval = setInterval(() => {
      current += step;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(current);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [value]);

  return <span>{display}</span>;
};

/* =====================
   COMPONENT
===================== */
const Vmanage = () => {
  const fetchingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [loading, setLoading] = useState(false);
  const [animatedIndex, setAnimatedIndex] = useState(-1);

  const [totalSites, setTotalSites] = useState(0);
  const [table1Count, setTable1Count] = useState(0);
  const [table2Count, setTable2Count] = useState(0);

  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);
  const [partial, setPartial] = useState(0);

  /* =====================
     LOAD FUNCTION (FIXED FOR EMPTY TUNNELS)
  ===================== */
  async function load() {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setAnimatedIndex(-1);

    try {
      const res = await fetch("/api/sdwan/tunnels");
      const json = await res.json();
      console.log("Vmanage json:", json);

      const sites = json?.sites ?? {};
      const systemIps = Object.keys(sites);

      let upCount = 0;
      let downCount = 0;
      let partialCount = 0;

      let t1 = 0;
      let t2 = 0;

      systemIps.forEach((systemIp) => {
        const site = sites[systemIp];
        const tunnels = Array.isArray(site?.tunnels)
          ? site.tunnels
          : [];

        // Count table membership FIRST (even if tunnels empty)
        if (TABLE1_IPS.has(systemIp)) {
          t1++;
        } else {
          t2++;
        }

        // 🔥 NEW LOGIC: EMPTY TUNNELS = DOWN
        if (tunnels.length === 0) {
          downCount++;
          return;
        }

        const upTunnels = tunnels.filter(
          (t: any) => t.state === "up"
        ).length;

        const downTunnels = tunnels.filter(
          (t: any) => t.state === "down"
        ).length;

        if (upTunnels === tunnels.length) upCount++;
        else if (downTunnels === tunnels.length) downCount++;
        else partialCount++;
      });

      const realTotal = t1 + t2; // 182

      setTotalSites(realTotal);
      setTable1Count(t1);
      setTable2Count(t2);

      setDown(downCount);
      setPartial(partialCount);
      setUp(upCount);

      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          totalSites: realTotal,
          table1Count: t1,
          table2Count: t2,
          upCount,
          downCount,
          partialCount,
        })
      );

      // stagger animation
      [0, 1, 2].forEach((i) =>
        setTimeout(() => setAnimatedIndex(i), i * BAR_ANIM_DELAY)
      );
    } catch (e) {
      console.error("JSON LOAD ERROR:", e);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  /* =====================
     INITIAL + INTERVAL LOAD
  ===================== */
  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Percentages based on TOTAL 182 (both tables)
  const getPct = (value: number) =>
    totalSites ? Math.round((value / totalSites) * 100) : 0;

  const rows = [
    { key: "up", label: "UP", value: up, color: "#52c41a" },
    { key: "partial", label: "PARTIAL", value: partial, color: "#faad14" },
    { key: "down", label: "DOWN", value: down, color: "#ff4d4f" },
  ];

  const columns = [
    {
      title: "Status",
      dataIndex: "label",
      render: (text: string, record: any) => (
        <span style={{ fontWeight: 600, color: record.color }}>{text}</span>
      ),
    },
    {
      title: "Count",
      align: "right" as const,
      render: (_: any, record: any) => (
        <AnimatedNumber value={record.value} />
      ),
    },
    {
      title: "Usage",
      render: (_: any, record: any, index: number) => (
        <div
          style={{
            height: 8,
            background: "var(--ant-color-bg-layout,#eaeaea)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width:
                animatedIndex >= index
                  ? `${getPct(record.value)}%`
                  : "0%",
              height: "100%",
              background: record.color,
              borderRadius: 8,
              transition: "width 700ms ease",
              animation:
                record.key === "down" && down > 0
                  ? "pulse 1.2s infinite"
                  : undefined,
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255,77,79,0.5); }
          70% { box-shadow: 0 0 0 6px rgba(255,77,79,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,77,79,0); }
        }
      `}</style>

      <Card
        title="WAN Edge"
        style={{ width: "100%",height:"100%", borderRadius: 16 }}
        extra={
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>
              <AnimatedNumber value={totalSites} />{" "}
              <span style={{ fontSize: 12, color: "#888" }}>
                Total Sites
              </span>
            </div>

          </div>
        }
      >
        {loading ? (
          <Spin />
        ) : (
          <Table
            
            columns={columns}
            dataSource={rows}
            pagination={false}
            size="large"
          />
        )}
      </Card>
    </>
  );
};

export default Vmanage;
