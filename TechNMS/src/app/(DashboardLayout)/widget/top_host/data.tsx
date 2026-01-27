"use client";

import React, { useState, useEffect, useRef } from "react";
import { Form, Table } from "antd";

import useZabbixData from "../three";
import ColumnModal, { ColumnConfig } from "./ColumnModal";
import axios from "axios";
import branches from "../../availability/data/data";

const makeId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

interface TopHostProps {
  mode?: "preview" | "widget";
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
  topHostName?: ("host1" | "host2" | "host3")[];
}

const HOST_ITEM_MAP: Record<"host1" | "host2" | "host3", string[]> = {
  host1: [
    'Interface ["GigabitEthernet0/0/0"]: Operational status',
    'Interface ["GigabitEthernet0/0/1"]: Operational status',
  ],
  host2: [
    'Interface ["GigabitEthernet0/0/0"]: Bits sent',
    'Interface ["GigabitEthernet0/0/0"]: Bits received',
    'Interface ["GigabitEthernet0/0/0"]: Speed',
    "Memory utilization",
    "CPU utilization",
    "Certificate validity",
  ],
  host3: [
    'Interface ["GigabitEthernet0/0/1"]: Bits sent',
    'Interface ["GigabitEthernet0/0/1"]: Bits received',
    'Interface ["GigabitEthernet0/0/1"]: Speed',
  ],
};

/* ===================== HEADER MAPS ===================== */

const COLUMN_HEADER_MAP_HOST1: Record<string, string> = {
  'Interface ["GigabitEthernet0/0/0"]: Operational status': "Primary Link",
  'Interface ["GigabitEthernet0/0/1"]: Operational status': "Secondary Link",
};

const COLUMN_HEADER_MAP_HOST2: Record<string, string> = {
  'Interface ["GigabitEthernet0/0/0"]: Bits received': "Primary Bits Received",
  'Interface ["GigabitEthernet0/0/0"]: Bits sent': "Primary Bits Sent",
  'Interface ["GigabitEthernet0/0/0"]: Speed': "Speed",
  "CPU utilization": "CPU Usage",
  "Memory utilization": "Memory Usage",
  "Certificate validity": "Certificate",
};

const COLUMN_HEADER_MAP_HOST3: Record<string, string> = {
  'Interface ["GigabitEthernet0/0/1"]: Bits received': "Secondary Bits Received",
  'Interface ["GigabitEthernet0/0/1"]: Bits sent': "Secondary Bits Sent",
  'Interface ["GigabitEthernet0/0/1"]: Speed': "Speed",
};

const getColumnTitle = (itemName: string) => {
  if (HOST_ITEM_MAP.host1.includes(itemName)) {
    return COLUMN_HEADER_MAP_HOST1[itemName] ?? itemName;
  }

  if (HOST_ITEM_MAP.host3.includes(itemName)) {
    return COLUMN_HEADER_MAP_HOST3[itemName] ?? itemName;
  }

  return COLUMN_HEADER_MAP_HOST2[itemName] ?? itemName;
};

/* HOST2 TRAFFIC COLUMNS */
const HOST2_TRAFFIC_ITEMS = [
  'Interface ["GigabitEthernet0/0/0"]: Bits sent',
  'Interface ["GigabitEthernet0/0/0"]: Bits received',
  'Interface ["GigabitEthernet0/0/0"]: Speed',
];

const HOST3_TRAFFIC_ITEMS = [
  'Interface ["GigabitEthernet0/0/1"]: Bits sent',
  'Interface ["GigabitEthernet0/0/1"]: Bits received',
  'Interface ["GigabitEthernet0/0/1"]: Speed',
];

/* ✅ NEW: CONVERT VALUES PROPERLY (BITS → kbps/Mbps/Gbps) */
const normalizeNetworkValue = (value: any, units?: string) => {
  const num = Number(value);
  if (isNaN(num)) return { value: "-", unit: "" };

  // If Zabbix says units "Bps" or "bps" or empty, treat it as bits/sec (your current data looks like bits/sec)
  const isBits =
    !units ||
    units === "bps" ||
    units === "Bps" ||
    units === "bit/s" ||
    units === "bits";

  // ✅ Convert bits/sec → kbps/mbps/gbps
  if (isBits) {
    const kbps = num / 1000;
    const mbps = kbps / 1000;
    const gbps = mbps / 1000;

    if (gbps >= 1) return { value: gbps.toFixed(2), unit: "Gbps" };
    if (mbps >= 1) return { value: mbps.toFixed(2), unit: "Mbps" };
    if (kbps >= 1) return { value: kbps.toFixed(2), unit: "kbps" };

    return { value: num.toFixed(0), unit: "bps" };
  }

  // ✅ If already has K / M (your old mapping), keep same style
  if (units === "M") return { value: num.toFixed(2), unit: "Mbps" };
  if (units === "K") return { value: num.toFixed(2), unit: "kbps" };

  return { value: num.toFixed(2), unit: units };
};

const TopHost: React.FC<TopHostProps> = ({
  mode = "widget",
  onConfigChange,
  initialConfig,
  topHostName,
}) => {
  const { hosts, items, fetchZabbixData } = useZabbixData();
  const user_token = localStorage.getItem("zabbix_auth");

  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  const [editing, setEditing] = useState<ColumnConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  /* ===================== INITIAL DATA FETCH ===================== */

  useEffect(() => {
    if (!topHostName?.length) return;

    const fetchDashboardData = async () => {
      try {
        const responses = await Promise.all(
          topHostName.map((hostKey) =>
            axios.post("/api/tjsb/get_item", {
              auth: user_token,
              name: HOST_ITEM_MAP[hostKey],
              groupids: ["210"],
            })
          )
        );

        const apiResult = responses.flatMap((res) => res.data?.result ?? []);

        const updated: ColumnConfig[] = [];

        apiResult.forEach((row: any) => {
          const resolvedHostName =
            row.hostname ||
            row.hosts?.[0]?.name ||
            hosts.find((h) => h.hostid === row.hostid)?.name ||
            row.hostid;

          updated.push({
            id: makeId(),
            name: row.name,
            data: "Item value",
            display: "as_is",
            extraHostGroups: ["210"],

            hostId: row.hostid,
            hostName: resolvedHostName,
            itemId: row.itemid,
            itemKey: row.key_,
            itemName: row.name,

            apiData: {
              ...row,
              hostname: resolvedHostName,
            },
          });
        });

        setColumnsConfig(updated);
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      }
    };

    fetchDashboardData();
  }, [user_token, topHostName]);

  useEffect(() => {
    if (initialConfig?.columns) setColumnsConfig(initialConfig.columns);
  }, [initialConfig]);

  useEffect(() => {
    if (!onConfigChange) return;
    onConfigChange({ columns: columnsConfig });
  }, [columnsConfig, onConfigChange]);

  const findBranch = (hostName: string | undefined) => {
    if (!hostName) return "-";
    const match =
      branches.find(
        (b: any) =>
          hostName.includes(b.code) ||
          hostName.toLowerCase() === b.name.toLowerCase()
      ) ?? null;
    return match ? match.name : "-";
  };

  /* ===================== BUILD TABLE DATA ===================== */

  const hostsMap: Record<string, any> = {};

  columnsConfig.forEach((c) => {
    if (!(c as any).apiData) return;

    const api = (c as any).apiData;

    if (!hostsMap[c.hostName!]) {
      hostsMap[c.hostName!] = {
        key: c.hostName!,
        host: c.hostName!,
        branch: findBranch(c.hostName),
      };
    }

    if (
      HOST2_TRAFFIC_ITEMS.includes(c.name!) ||
      HOST3_TRAFFIC_ITEMS.includes(c.name!)
    ) {
      hostsMap[c.hostName!][c.name!] = {
        value: api?.lastvalue ?? 0,
        units: api?.units,
      };
      return;
    }

    if (c.name === "CPU utilization" || c.name === "Memory utilization") {
      hostsMap[c.hostName!][c.name!] = {
        value: api?.lastvalue ?? 0,
        statusColor: api?.statusColor,
      };
      return;
    }

    hostsMap[c.hostName!][c.name!] = api?.lastvalue ?? 0;
  });

  let tableRows: any[] = Object.values(hostsMap);

  const uniqueColumns = columnsConfig.filter(
    (c, i, arr) => arr.findIndex((x) => x.name === c.name) === i
  );

  const COL_A = 'Interface ["GigabitEthernet0/0/0"]: Operational status';
  const COL_B = 'Interface ["GigabitEthernet0/0/1"]: Operational status';

  tableRows = [...tableRows].sort((a, b) => {
    const aA = Number(a[COL_A]) === 1 ? 1 : 0;
    const bA = Number(b[COL_A]) === 1 ? 1 : 0;
    if (aA !== bA) return bA - aA;

    const aB = Number(a[COL_B]) === 1 ? 1 : 0;
    const bB = Number(b[COL_B]) === 1 ? 1 : 0;
    if (aB !== bB) return bB - aB;

    for (let col of uniqueColumns) {
      const colName = col.name!;
      const aVal = Number(a[colName]) === 1 ? 1 : 0;
      const bVal = Number(b[colName]) === 1 ? 1 : 0;
      if (aVal !== bVal) return bVal - aVal;
    }

    return 0;
  });

  if (topHostName?.includes("host2")) {
    const bitsRecvCol = 'Interface ["GigabitEthernet0/0/0"]: Bits received';

    tableRows = [...tableRows].sort((a, b) => {
      const aVal = Number(a?.[bitsRecvCol]?.value ?? 0);
      const bVal = Number(b?.[bitsRecvCol]?.value ?? 0);
      // return bVal - aVal;
      return aVal - bVal;
    });
  }

  if (topHostName?.includes("host3")) {
    const bitsRecvCol = 'Interface ["GigabitEthernet0/0/1"]: Bits received';

    tableRows = [...tableRows].sort((a, b) => {
      const aVal = Number(a?.[bitsRecvCol]?.value ?? 0);
      const bVal = Number(b?.[bitsRecvCol]?.value ?? 0);
      return bVal - aVal;
    });
  }



  const dynamicColumns = uniqueColumns.map((c) => ({
    title: getColumnTitle(c.name!),
    dataIndex: c.name!,
    render: (cell: any) => {
      if (cell && typeof cell === "object" && "units" in cell) {
        // ✅ UPDATED: convert to kbps/Mbps/Gbps properly
        const normalized = normalizeNetworkValue(cell.value, cell.units);

        return (
          <span style={{ fontWeight: 600 }}>
            {normalized.value} {normalized.unit}
          </span>
        );
      }

      if (c.name === "CPU utilization" || c.name === "Memory utilization") {
        if (!cell) return "-";

        const value = Number(cell.value);
        const color = cell.statusColor;

        const bg =
          color === "green"
            ? "#00b050"
            : color === "orange"
              ? "#ffa500"
              : color === "red"
                ? "#ff0000"
                : undefined;

        return (
          <span
            style={{
              display: "block",
              textAlign: "center",
              padding: "4px 0",
              background: bg,
              color: bg ? "#fff" : "#000",
              fontWeight: 600,
            }}
          >
            {value.toFixed(2)}%
          </span>
        );
      }

      const num = Number(cell);
      if (num === 0) {
        return (
          <span
            style={{
              display: "block",
              textAlign: "center",
              padding: "4px 0",
              background: "#00b050",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            up
          </span>
        );
      }

      if (num === 1) {
        return (
          <span
            style={{
              display: "block",
              textAlign: "center",
              padding: "4px 0",
              background: "#ff0000",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            down
          </span>
        );
      }

      return cell ?? "-";
    },
  }));

  /* ===================== TABLE TITLE ===================== */

  const getTableTitle = () => {
    if (topHostName?.includes("host1")) {
      return "Branch - Port Status";
    }

    if (topHostName?.includes("host2")) {
      return "Branch - Health - Primary Port";
    }

    return "Branch - Health - Secondary Port";
  };

  const tableWrapperRef = useRef<HTMLDivElement | null>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTop += e.deltaY;
    }
  };

  return (
    <>
      <Form layout="vertical">
        <h1>{getTableTitle()}</h1>

        <div
          ref={tableWrapperRef}
          onWheel={handleWheel}
          style={{ maxHeight: 400 }}
        >
          <Table
            size="large"
            rowKey="key"
            pagination={false}
            dataSource={tableRows}
            columns={[
              { title: "Branch", dataIndex: "branch" },
              { title: "Host", dataIndex: "host" },
              ...dynamicColumns,
            ]}
          />
        </div>
      </Form>

      <ColumnModal
        open={open}
        hosts={hosts}
        items={items}
        initialData={editing}
        existingColumns={columnsConfig}
        onHostChange={(h) => fetchZabbixData("item", [h])}
        onCancel={() => setOpen(false)}
        onSubmit={() => { }}
        selectedHostGroups={selectedGroups}
      />
    </>
  );
};

export default TopHost;
