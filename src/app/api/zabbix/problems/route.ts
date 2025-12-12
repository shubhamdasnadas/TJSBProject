import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { auth, startDate, startTime, endDate, endTime, groupids } =
      await req.json();

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    const time_from = Math.floor(
      new Date(`${startDate} ${startTime}`).getTime() / 1000
    );
    const time_till = Math.floor(
      new Date(`${endDate} ${endTime}`).getTime() / 1000
    );

    console.log("🕒 Range:", { time_from, time_till });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    const payload = {
      jsonrpc: "2.0",
      method: "event.get",
      params: {
        output: ["eventid", "clock", "value", "severity", "objectid"],
        groupids: groupids?.length ? groupids : [],
        time_from,
        time_till,
        value: 1,
        selectHosts: ["name"],
        sortfield: "clock",
        sortorder: "DESC",
      },
      auth,
      id: 1,
    };

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: { "Content-Type": "application/json-rpc" },
      httpsAgent,
      timeout: 10000,
    });

    const events = response.data?.result || [];

    let counts = {
      disaster: 0,
      high: 0,
      average: 0,
      warning: 0,
      information: 0,
      not_classified: 0,
    };

    events.forEach((event: any) => {
      switch (String(event.severity)) {
        case "5": counts.disaster++; break;
        case "4": counts.high++; break;
        case "3": counts.average++; break;
        case "2": counts.warning++; break;
        case "1": counts.information++; break;
        default: counts.not_classified++; break;
      }
    });

    return NextResponse.json({
      counts,
      events, // SEND raw events separately
    });

  } catch (error: any) {
    console.error("event.get error:", error.message);
    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
