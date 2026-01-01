import { NextResponse } from "next/server";

const ZABBIX_URL =
  "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";

const TOKEN =
  "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

export async function POST(req: Request) {
  try {
    const { eventid, message, severity, closeProblem } = await req.json();

    let action = 0;

    if (message && message.trim()) action |= 1;   // add message
    if (closeProblem) action |= 2;                // close problem
    if (severity !== null && severity !== "") action |= 4; // change severity

    if (!action) {
      return NextResponse.json(
        { error: "No update action selected." },
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
        Authorization: `Bearer ${TOKEN}` // ✅ SAME AS sysreport
      },
      body: JSON.stringify(body)
    });

    const json = await res.json();

    if (json.error) {
      throw new Error(json.error.data || "Acknowledge failed");
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
