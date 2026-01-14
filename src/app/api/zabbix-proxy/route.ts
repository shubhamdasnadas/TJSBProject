import { NextRequest, NextResponse } from "next/server";

/* =========================
   DIRECT ZABBIX API PROXY
   (Matching PowerShell approach)
========================= */

const ZABBIX_URL = "http://localhost:8080/api_jsonrpc.php";
const API_TOKEN = "b7b3f30c91bf343ff7ea4b169e08c7746c7e1c166f0aefb7f2930921c6a7690b";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(ZABBIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json-rpc",
        "Authorization": `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Zabbix Response Status:", response.status);
      return NextResponse.json(
        { error: `HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.error) {
      console.error("Zabbix API Error:", data.error);
      return NextResponse.json(data, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Zabbix Proxy Error:", err.message);

    if (err.name === "AbortError") {
      return NextResponse.json(
        { error: "Zabbix server timeout (25s)" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Zabbix proxy failed" },
      { status: 502 }
    );
  }
}
