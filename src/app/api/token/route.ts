// app/api/createToken/route.ts
import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { userid, auth, tokenName } = await req.json(); // tokenName is optional

    if (!userid || !auth) {
      return NextResponse.json(
        { error: "userid and auth are required" },
        { status: 400 }
      );
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    const payload = {
      jsonrpc: "2.0",
      method: "token.create",
      params: {
        name: tokenName || `user-${userid}-token`,
        userid,
      },
      auth,
      id: 2,
    };

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: { "Content-Type": "application/json-rpc" },
      httpsAgent,
      timeout: 10000,
    });

    if (response.data?.result) {
      return NextResponse.json({ token: response.data.result.value });
    }

    return NextResponse.json(
      { error: response.data?.error || "Token creation failed" },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("Zabbix token creation error:", error.message);
    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
