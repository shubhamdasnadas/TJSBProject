import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

// Use environment variable to control TLS verification.
const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';

const httpsAgent = new https.Agent({
  rejectUnauthorized,
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mapId = searchParams.get('id');

    const zabbixUrl = process.env.NEXT_PUBLIC_ZABBIX_URL;
    const authToken = 
      process.env.ZABBIX_AUTH_TOKEN ||
      process.env.token ||
      process.env.NEXT_PUBLIC_ZABBIX_AUTH_TOKEN;

    if (!zabbixUrl || !authToken) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
    }

    if (!mapId) {
      return NextResponse.json({ error: "Missing map ID" }, { status: 400 });
    }

    // 1. Get Map Data
    const mapResponse = await axios.post(
      zabbixUrl,
      {
        jsonrpc: "2.0",
        method: "map.get",
        params: {
          sysmapids: [mapId],
          output: "extend",
          selectSelements: "extend",
          selectLinks: "extend",
        },
        auth: authToken,
        id: 1,
      },
      { httpsAgent }
    );

    const map = mapResponse.data.result[0];
    if (!map) {
      return NextResponse.json({ error: "Map not found" }, { status: 404 });
    }

    // 2. Extract Host IDs
    const hostIds = map.selements
      .filter((element: any) => element.elements.length > 0)
      .map((element: any) => element.elements[0].hostid);
    
    let hosts: any[] = [];
    if (hostIds.length > 0) {
      // 3. Get Host Data
      const hostsResponse = await axios.post(
        zabbixUrl,
        {
          jsonrpc: "2.0",
          method: "host.get",
          params: {
            hostids: hostIds,
            output: ["hostid", "name", "status"],
            selectInterfaces: ["ip"],
          },
          auth: authToken,
          id: 1,
        },
        { httpsAgent }
      );
      hosts = hostsResponse.data.result;
    }

    let problems: any[] = [];
    if (hostIds.length > 0) {
      // 4. Get Problems
      const problemsResponse = await axios.post(
        zabbixUrl,
        {
          jsonrpc: "2.0",
          method: "problem.get",
          params: {
            hostids: hostIds,
            output: "extend",
          },
          auth: authToken,
          id: 1,
        },
        { httpsAgent }
      );
      problems = problemsResponse.data.result;
    }

    // 5. Combine Data
    const combinedData = {
      map,
      hosts,
      problems,
    };

    return NextResponse.json(combinedData);
  } catch (error: any) {
    console.error("Zabbix API error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
