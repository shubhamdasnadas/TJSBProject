import { NextResponse } from "next/server";

const ZABBIX_URL =
  process.env.NEXT_PUBLIC_ZABBIX_URL ||
  "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const auth = req.headers.get("authorization");

    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Bearer token" },
        { status: 401 }
      );
    }

    const res = await fetch(ZABBIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Proxy error" },
      { status: 500 }
    );
  }
}
