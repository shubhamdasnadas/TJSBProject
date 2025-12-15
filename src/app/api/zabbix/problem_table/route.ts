import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/*
Expected POST body:
{
  auth: string,
  groupids?: string[],
  hostids?: string[],
  triggerids?: string[]
}
*/

export async function POST(req: Request) {
  try {
    const { auth, groupids, hostids, triggerids } = await req.json();

    if (!auth) {
      return NextResponse.json(
        { error: "Missing Zabbix auth token" },
        { status: 401 }
      );
    }

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    /* ===================== 1️⃣ problem.get ===================== */

    const problemParams: any = {
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
    };

    if (Array.isArray(groupids) && groupids.length > 0) {
      problemParams.groupids = groupids;
    }
    if (Array.isArray(hostids) && hostids.length > 0) {
      problemParams.hostids = hostids;
    }
    if (Array.isArray(triggerids) && triggerids.length > 0) {
      problemParams.objectids = triggerids;
    }

    const problemPayload = {
      jsonrpc: "2.0",
      method: "problem.get",
      params: problemParams,
      auth,
      id: 1,
    };

    const problemRes = await axios.post(ZABBIX_URL, problemPayload, {
      httpsAgent,
      headers: { "Content-Type": "application/json-rpc" },
      timeout: 15000,
    });

    if (problemRes.data?.error) {
      return NextResponse.json(problemRes.data, { status: 502 });
    }

    const problems = problemRes.data?.result || [];
    if (!Array.isArray(problems) || problems.length === 0) {
      return NextResponse.json({ result: [] });
    }

    /* ===================== 2️⃣ trigger.get ===================== */

    const triggerIds = Array.from(
      new Set(problems.map((p: any) => p.objectid))
    );

    const triggerPayload = {
      jsonrpc: "2.0",
      method: "trigger.get",
      params: {
        output: ["triggerid", "description", "priority", "status", "comments"],
        selectHosts: ["hostid", "name"],
        selectDependencies: ["triggerid", "description"],
        expandDescription: true,
        triggerids: triggerIds,
      },
      auth,
      id: 2,
    };

    const triggerRes = await axios.post(ZABBIX_URL, triggerPayload, {
      httpsAgent,
      headers: { "Content-Type": "application/json-rpc" },
      timeout: 15000,
    });

    if (triggerRes.data?.error) {
      return NextResponse.json(triggerRes.data, { status: 502 });
    }

    /* ===================== 3️⃣ MERGE ===================== */

    const triggerMap: Record<string, any> = {};
    triggerRes.data.result.forEach((t: any) => {
      triggerMap[t.triggerid] = t;
    });

    const merged = problems.map((p: any) => {
      const trigger = triggerMap[p.objectid];

      return {
        eventid: p.eventid,
        triggerid: p.objectid,
        clock: p.clock,
        r_clock: p.r_clock,
        name: p.name,
        acknowledged: p.acknowledged,
        severity: p.severity,
        tags: p.tags || [],
        trigger,
      };
    });

    return NextResponse.json({ result: merged });
  } catch (error: any) {
    console.error("problem_table API failed:", error.message || error);
    return NextResponse.json(
      { error: "Failed to fetch problem table data" },
      { status: 500 }
    );
  }
}
