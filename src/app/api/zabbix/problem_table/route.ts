import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST() {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const zabbixUrl = process.env.NEXT_PUBLIC_ZABBIX_URL || process.env.ZABBIX_URL;
    // Prefer the locally configured token while keeping existing fallbacks
    const authToken =
      process.env.token ||
      process.env.ZABBIX_AUTH_TOKEN ||
      process.env.NEXT_PUBLIC_ZABBIX_AUTH_TOKEN;

    if (!zabbixUrl) {
      console.error("Missing Zabbix URL environment variable");
      return NextResponse.json({ error: "Missing Zabbix URL" }, { status: 500 });
    }

    if (!authToken) {
      console.error("Missing Zabbix auth token (ZABBIX_AUTH_TOKEN)");
      return NextResponse.json({ error: "Missing Zabbix auth token" }, { status: 401 });
    }

    const response = await axios.post(
      zabbixUrl,
      {
        jsonrpc: "2.0",
        method: "trigger.get",
        params: {
          output: ["triggerid", "description", "priority", "status", "lastchange"],
          filter: { value: 1 },
          expandDescription: true,
          selectHosts: ["hostid", "host", "name"],
          selectGroups: ["groupid", "name"],
          selectTags: ["tag", "value"],
        },
        auth: authToken,
        id: 1,
      },
      { httpsAgent }
    );

    // If Zabbix returned a JSON-RPC error object, forward it with a clear status
    if (response?.data && response.data.error) {
      console.error("Zabbix API returned an error:", response.data.error);
      // Use 401 for authorization problems, otherwise 502 for upstream errors
      const status = String(response.data.error.data || "").toLowerCase().includes("not authorized") ? 401 : 502;
      return NextResponse.json(response.data, { status });
    }

    return NextResponse.json(response.data);
  } catch (error) {
    console.error("Zabbix API Error:", error);
    return NextResponse.json({ error: "Failed to fetch triggers" }, { status: 500 });
  }
}
