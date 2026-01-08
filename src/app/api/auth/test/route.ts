import { NextResponse } from "next/server";

export async function GET() {
  const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL || process.env.ZABBIX_URL;
  
  const config = {
    ZABBIX_URL: ZABBIX_URL || "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    TLS_REJECT: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
  };

  if (!ZABBIX_URL) {
    return NextResponse.json({
      error: "ZABBIX_URL not configured",
      config,
    }, { status: 500 });
  }

  try {
    // Test connection to Zabbix
    const response = await fetch(ZABBIX_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "apiinfo.version",
        params: {},
        id: 1,
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      config,
      zabbixVersion: data.result,
      connectionStatus: "OK",
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      config,
      error: err.message,
      connectionStatus: "FAILED",
    }, { status: 500 });
  }
}
