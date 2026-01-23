"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, Spin, Table, Tooltip } from "antd";
import branches from "@/app/(DashboardLayout)/availability/data/data";
/* =====================
   CONSTANTS
===================== */
const CACHE_KEY = "sdwan_tunnel_cache_summary";
const REFRESH_INTERVAL = 2 * 60 * 1000;
const BAR_ANIM_DELAY = 250;
const COUNT_ANIM_DURATION = 800;

/* =====================
   COUNT-UP
===================== */
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(value / (COUNT_ANIM_DURATION / 16)));

    const id = window.setInterval(() => {
      current += step;
      if (current >= value) {
        setDisplay(value);
        clearInterval(id);
      } else setDisplay(current);
    }, 16);

    return () => clearInterval(id);
  }, [value]);

  return <span>{display}</span>;
};

/* =====================
   COMPONENT
===================== */
const Vmanage = () => {
  const fetchingRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [animatedIndex, setAnimatedIndex] = useState(-1);

  const [totalSites, setTotalSites] = useState(0);
  const [up, setUp] = useState(0);
  const [down, setDown] = useState(0);
  const [partial, setPartial] = useState(0);

  const [details, setDetails] = useState<{
    partial: any[];
    down: any[];
  }>({ partial: [], down: [] });

  const getBranchName = (host?: string) => {
    if (!host) return "-";
    const match = branches.find(
      (b: any) =>
        host.includes(b.code) ||
        host.toLowerCase() === b.name.toLowerCase()
    );
    return match ? match.name : "-";
  };

  /* =====================
     LOAD (UNCHANGED)
  ===================== */
  async function load() {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setAnimatedIndex(-1);

    try {
      const res = await fetch("/api/sdwan/tunnels");
      const json = await res.json();

      const sites = json?.sites ?? {};
      const ips = Object.keys(sites);

      let upC = 0,
        downC = 0,
        partialC = 0;

      const partialArr: any[] = [];
      const downArr: any[] = [];

      ips.forEach((ip) => {
        const site = sites[ip];
        const tunnels = Array.isArray(site?.tunnels) ? site.tunnels : [];

        const downTunnels = tunnels.filter(
          (t: any) => t.state === "down"
        );

        if (tunnels.length === 0) {
          downC++;
          downArr.push({ host: site.hostname, ip, tunnels: [] });
          return;
        }

        if (downTunnels.length === tunnels.length) {
          downC++;
          downArr.push({ host: site.hostname, ip, tunnels: downTunnels });
        } else if (downTunnels.length > 0) {
          partialC++;
          partialArr.push({
            host: site.hostname,
            ip,
            tunnels: downTunnels,
          });
        } else {
          upC++;
        }
      });

      setTotalSites(ips.length);
      setUp(upC);
      setDown(downC);
      setPartial(partialC);
      setDetails({ partial: partialArr, down: downArr });

      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ upC, downC, partialC })
      );

      [0, 1, 2].forEach((i) =>
        setTimeout(() => setAnimatedIndex(i), i * BAR_ANIM_DELAY)
      );
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    intervalRef.current = window.setInterval(load, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const getPct = (v: number) =>
    totalSites ? Math.round((v / totalSites) * 100) : 0;

  /* =====================
     TOOLTIP (FULL STRING)
  ===================== */
  const TooltipContent = (
    type: "partial" | "down",
    bg: string
  ) => (
    <div
      style={{
        background: bg,
        padding: 12,
        maxHeight: 300,
        overflowY: "auto",
        borderRadius: 8,
        minWidth: 360,
      }}
    >
      {details[type].map((s, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600 }}>
            {getBranchName(s.host)}
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{s.ip}</div>
        </div>
      ))}
    </div>
  );

  const rows = [
    { key: "up", label: "UP", value: up, color: "#52c41a" },
    { key: "partial", label: "PARTIAL", value: partial, color: "#faad14" },
    { key: "down", label: "DOWN", value: down, color: "#ff4d4f" },
  ];

  const columns = [
    {
      title: "Status",
      dataIndex: "label",
      render: (t: string, r: any) => (
        <b style={{ color: r.color }}>{t}</b>
      ),
    },
    {
      title: "Count",
      align: "right" as const,
      render: (_: any, r: any) => {
        const countNode = <AnimatedNumber value={r.value} />;

        // Tooltip ONLY for non-"up" rows
        if (r.key === "up") return countNode;

        return (
          <Tooltip
            placement="right"
            color={r.color}
            title={TooltipContent(r.key, r.color)}
          >
            <span style={{ cursor: "pointer" }}>
              {countNode}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Usage",
      render: (_: any, r: any, i: number) => {
        const bar = (
          <div style={{ height: 8, background: "#eee", borderRadius: 8 }}>
            <div
              style={{
                height: "100%",
                width:
                  animatedIndex >= i ? `${getPct(r.value)}%` : "0%",
                background: r.color,
                borderRadius: 8,
                transition: "width 700ms ease",
              }}
            />
          </div>
        );

        if (r.key === "up") return bar;

        return (
          <Tooltip
            placement="right"
            color={r.color}
            title={TooltipContent(r.key, r.color)}
          >
            {bar}
          </Tooltip>
        );
      },
    },
  ];

  return (
    <Card
      title="WAN Edge"
      extra={
        <b>
          <AnimatedNumber value={totalSites} />{" "}
          <span style={{ fontSize: 12, color: "#888" }}>
            Total Sites
          </span>
        </b>
      }
    >
      {loading ? (
        <Spin />
      ) : (
        <Table
          columns={columns}
          dataSource={rows}
          pagination={false}
        />
      )}
    </Card>
  );
};

export default Vmanage;
