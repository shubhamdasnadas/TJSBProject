import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function GET(req: Request) {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
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

    const params: any = {
      output: "extend",
      selectSelements: "extend",
      selectLinks: "extend",
    };

    // If mapId is provided, fetch specific map
    if (mapId) {
      params.sysmapids = [mapId];
    }

    const res = await axios.post(
      zabbixUrl,
      {
        jsonrpc: "2.0",
        method: "map.get",
        params,
        auth: authToken,
        id: 1,
      },
      { httpsAgent }
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    console.error("Zabbix API error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const body = await req.json();

    const zabbixUrl = process.env.NEXT_PUBLIC_ZABBIX_URL;
    const authToken = 
      process.env.ZABBIX_AUTH_TOKEN ||
      process.env.token ||
      process.env.NEXT_PUBLIC_ZABBIX_AUTH_TOKEN;

    if (!zabbixUrl || !authToken) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
    }

    // Create new map
    const res = await axios.post(
      zabbixUrl,
      {
        jsonrpc: "2.0",
        method: "map.create",
        params: body,
        auth: authToken,
        id: 1,
      },
      { httpsAgent }
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    console.error("Zabbix API error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
    const body = await req.json();

    const zabbixUrl = process.env.NEXT_PUBLIC_ZABBIX_URL;
    const authToken = 
      process.env.ZABBIX_AUTH_TOKEN ||
      process.env.token ||
      process.env.NEXT_PUBLIC_ZABBIX_AUTH_TOKEN;

    if (!zabbixUrl || !authToken) {
      return NextResponse.json({ error: "Missing configuration" }, { status: 500 });
    }

    // Update existing map
    const res = await axios.post(
      zabbixUrl,
      {
        jsonrpc: "2.0",
        method: "map.update",
        params: body,
        auth: authToken,
        id: 1,
      },
      { httpsAgent }
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    console.error("Zabbix API error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized: false });
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

    // Delete map
    const res = await axios.post(
      zabbixUrl,
      {
        jsonrpc: "2.0",
        method: "map.delete",
        params: [mapId],
        auth: authToken,
        id: 1,
      },
      { httpsAgent }
    );

    return NextResponse.json(res.data);
  } catch (error: any) {
    console.error("Zabbix API error:", error?.message);
    return NextResponse.json(
      { error: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
