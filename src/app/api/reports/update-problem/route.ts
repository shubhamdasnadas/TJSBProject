import { NextResponse } from "next/server";

const ZABBIX_URL =
  "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";
const TOKEN = "YOUR_TOKEN_HERE";

export async function POST(req: Request) {
  try {
    const { eventid, message, severity, closeProblem } = await req.json();

    let action = 0;

    // 1️⃣ Message
    if (message && message.trim()) {
      action += 1;
    }

    // 2️⃣ Close problem
    if (closeProblem) {
      action += 2;
    }

    // 3️⃣ Change severity
    if (severity !== null && severity !== undefined && severity !== "") {
      action += 4;
    }

    if (action === 0) {
      return NextResponse.json(
        { error: "At least one update operation or message must exist." },
        { status: 400 }
      );
    }

    const body: any = {
      jsonrpc: "2.0",
      method: "event.acknowledge",
      params: {
        eventids: [eventid],
        action,
        message
      },
      id: 1
    };

    if (action & 4) {
      body.params.severity = Number(severity);
    }

    const res = await fetch(ZABBIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json-rpc",
        "Authorization": `Bearer ${TOKEN}`
      },
      body: JSON.stringify(body)
    });

    const json = await res.json();

    if (json.error) {
      throw new Error(json.error.data);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
