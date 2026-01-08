import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

/**
 * Test endpoint to verify Zabbix connection and check what data exists
 * POST body: { "auth": "your-token" }
 */
export async function POST(req: Request) {
  try {
    const { auth } = await req.json();

    if (!auth) {
      return NextResponse.json(
        { error: "Missing auth token. Please provide your Zabbix API token." },
        { status: 400 }
      );
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    const results: any = {
      zabbix_url: ZABBIX_URL,
      timestamp: new Date().toISOString(),
    };

    // 1. Test API version
    try {
      const versionPayload = {
        jsonrpc: "2.0",
        method: "apiinfo.version",
        params: {},
        id: 1,
      };

      const versionRes = await axios.post(ZABBIX_URL, versionPayload, {
        headers: { "Content-Type": "application/json-rpc" },
        httpsAgent,
        timeout: 5000,
      });

      results.api_version = versionRes.data?.result || "Unknown";
    } catch (err: any) {
      results.api_version_error = err.message;
    }

    // 2. Test authentication by getting user info
    try {
      const userPayload = {
        jsonrpc: "2.0",
        method: "user.get",
        params: { output: ["userid", "username", "name", "surname", "role_name"] },
        id: 2,
      };

      const userRes = await axios.post(ZABBIX_URL, userPayload, {
        headers: {
          "Content-Type": "application/json-rpc",
          Authorization: `Bearer ${auth}`,
        },
        httpsAgent,
        timeout: 5000,
      });

      results.current_user = userRes.data?.result?.[0] || userRes.data?.error || "No user data";
    } catch (err: any) {
      results.user_error = err.message;
    }

    // 3. Get ALL host groups (no filter)
    try {
      const hostgroupPayload = {
        jsonrpc: "2.0",
        method: "hostgroup.get",
        params: {
          output: ["groupid", "name"],
          sortfield: "name",
        },
        id: 3,
      };

      const hostgroupRes = await axios.post(ZABBIX_URL, hostgroupPayload, {
        headers: {
          "Content-Type": "application/json-rpc",
          Authorization: `Bearer ${auth}`,
        },
        httpsAgent,
        timeout: 5000,
      });

      const groups = hostgroupRes.data?.result || [];
      results.hostgroups = {
        count: groups.length,
        groups: groups.slice(0, 10), // Show first 10
        all_group_names: groups.map((g: any) => g.name),
      };
    } catch (err: any) {
      results.hostgroups_error = err.message;
    }

    // 4. Get ALL hosts (no filter)
    try {
      const hostPayload = {
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "host", "name", "status"],
          sortfield: "name",
          limit: 20,
        },
        id: 4,
      };

      const hostRes = await axios.post(ZABBIX_URL, hostPayload, {
        headers: {
          "Content-Type": "application/json-rpc",
          Authorization: `Bearer ${auth}`,
        },
        httpsAgent,
        timeout: 5000,
      });

      const hosts = hostRes.data?.result || [];
      results.hosts = {
        count: hosts.length,
        sample_hosts: hosts.slice(0, 5),
      };
    } catch (err: any) {
      results.hosts_error = err.message;
    }

    // 5. Get template groups
    try {
      const templateGroupPayload = {
        jsonrpc: "2.0",
        method: "templategroup.get",
        params: {
          output: ["groupid", "name"],
          sortfield: "name",
        },
        id: 5,
      };

      const templateGroupRes = await axios.post(ZABBIX_URL, templateGroupPayload, {
        headers: {
          "Content-Type": "application/json-rpc",
          Authorization: `Bearer ${auth}`,
        },
        httpsAgent,
        timeout: 5000,
      });

      const tgroups = templateGroupRes.data?.result || [];
      results.template_groups = {
        count: tgroups.length,
        groups: tgroups.slice(0, 10),
      };
    } catch (err: any) {
      results.template_groups_error = err.message;
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error("Test Zabbix API error:", error.message);
    return NextResponse.json(
      {
        error: "Server error",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
