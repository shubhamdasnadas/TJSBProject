import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { auth, groupids = [], hostids = [], triggerids = [] } = body || {};

    if (!auth) {
      return NextResponse.json(
        { error: "Missing Zabbix auth token" },
        { status: 401 }
      );
    }

    const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL;
    if (!ZABBIX_URL) {
      return NextResponse.json(
        { error: "ZABBIX_URL not configured" },
        { status: 500 }
      );
    }

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    /* -------- problem.get -------- */
    const problemPayload = {
      jsonrpc: "2.0",
      method: "problem.get",
    
      id: 1,
      params: {
        output: [
          "eventid",
          "objectid",
          "clock",
          "r_clock",
          "name",
          "acknowledged",
          "severity",
        ],
        selectTags: ["tag", "value"],
        recent: false,
        sortfield: ["eventid"],
        sortorder: "DESC",
        ...(groupids.length && { groupids }),
        ...(hostids.length && { hostids }),
        ...(triggerids.length && { objectids: triggerids }),
      },
    };

    const { data: problemData } = await axios.post(ZABBIX_URL, problemPayload, {
      httpsAgent,
      headers: { "Content-Type": "application/json-rpc", Authorization: `Bearer ${auth}`, },
      timeout: 15000,
    });

    if (problemData?.error) {
      return NextResponse.json(problemData, { status: 502 });
    }

    const problems = Array.isArray(problemData?.result)
      ? problemData.result
      : [];

    if (!problems.length) {
      return NextResponse.json({ result: [] });
    }

    /* -------- trigger.get -------- */
    const triggerIds = Array.from(
      new Set(problems.map((p: any) => p.objectid))
    );

    const triggerPayload = {
      jsonrpc: "2.0",
      method: "trigger.get",

      id: 2,
      params: {
        output: ["triggerid", "description", "priority", "status", "comments"],
        selectHosts: ["hostid", "name"],
        selectDependencies: ["triggerid", "description"],
        expandDescription: true,
        triggerids: triggerIds,
      },
    };

    const { data: triggerData } = await axios.post(
      ZABBIX_URL,
      triggerPayload,
      {
        httpsAgent,
        headers: { "Content-Type": "application/json-rpc", Authorization: `Bearer ${auth}`, },
        timeout: 15000,
      }
    );

    if (triggerData?.error) {
      return NextResponse.json(triggerData, { status: 502 });
    }

    const triggerMap: Record<string, any> = {};
    (triggerData?.result || []).forEach((t: any) => {
      if (t?.triggerid) triggerMap[t.triggerid] = t;
    });

    const merged = problems.map((p: any) => ({
      eventid: p?.eventid,
      triggerid: p?.objectid,
      clock: p?.clock,
      r_clock: p?.r_clock,
      name: p?.name,
      acknowledged: p?.acknowledged,
      severity: p?.severity,
      tags: p?.tags || [],
      trigger: triggerMap[p?.objectid] || null,
    }));

    return NextResponse.json({ result: merged });
  } catch (err: any) {
    console.error("problem_table API failed:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to fetch problem table data" },
      { status: 500 }
    );
  }
}
