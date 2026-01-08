import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function GET() {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const ZABBIX_URL = "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";
    const TOKEN = "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

    const headers = {
      "Content-Type": "application/json-rpc",
      Authorization: `Bearer ${TOKEN}`,
    };

    const rpc = (payload: any) =>
      axios.post(ZABBIX_URL, payload, { headers, httpsAgent, timeout: 15000 });

    // 1) Get all hosts (id + name + groups)
    const hostsRes = await rpc({
      jsonrpc: "2.0",
      method: "host.get",
      params: { 
        output: ["hostid", "host"],
        selectGroups: ["groupid", "name"],
      },
      id: 1,
    });
    const hosts = hostsRes.data?.result || [];

    // 2) Get specific ifOperStatus items for primary [1] and secondary [2]
    const [pItemsRes, sItemsRes] = await Promise.all([
      rpc({
        jsonrpc: "2.0",
        method: "item.get",
        params: {
          output: ["itemid", "hostid", "lastvalue"],
          filter: { key_: "ifOperStatus[1]" },
          limit: 100000,
        },
        id: 2,
      }),
      rpc({
        jsonrpc: "2.0",
        method: "item.get",
        params: {
          output: ["itemid", "hostid", "lastvalue"],
          filter: { key_: "ifOperStatus[2]" },
          limit: 100000,
        },
        id: 3,
      }),
    ]);

    const pByHost: Record<string, string | undefined> = {};
    const sByHost: Record<string, string | undefined> = {};
    for (const it of pItemsRes.data?.result || []) pByHost[it.hostid] = it.lastvalue;
    for (const it of sItemsRes.data?.result || []) sByHost[it.hostid] = it.lastvalue;

    const mapAvail = (v?: string) => {
      // Per request: "1" => up (0), anything else => down (1)
      if (v === "1") return { value: 0, text: "up (0)" };
      return { value: 1, text: "down (1)" };
    };

    const rows = hosts.map((h: any) => {
      const p = mapAvail(pByHost[h.hostid]);
      const s = mapAvail(sByHost[h.hostid]);

      return {
        key: h.hostid,
        hostid: h.hostid,
        hostname: h.host,
        groups: Array.isArray(h.groups) ? h.groups.map((g: any) => g.name) : [],
        primaryValue: p.value,
        primaryText: p.text,
        secondaryValue: s.value,
        secondaryText: s.text,
      };
    });

    // Sort: any host with a problem (1) first
    rows.sort((a, b) => {
      const sevA = Math.max(a.primaryValue, a.secondaryValue);
      const sevB = Math.max(b.primaryValue, b.secondaryValue);
      if (sevA !== sevB) return sevB - sevA; // 1 first
      return a.hostname.localeCompare(b.hostname);
    });

    return NextResponse.json(rows);
  } catch (err: any) {
    console.error("if_status error:", err?.message || err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
