import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { auth, startDate, startTime, endDate, endTime } = await req.json();

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    // Convert to unix timestamps
    const time_from = Math.floor(
      new Date(`${startDate} ${startTime}`).getTime() / 1000
    );

    const time_till = Math.floor(
      new Date(`${endDate} ${endTime}`).getTime() / 1000
    );

    console.log("🕒 Converted timestamps:", { time_from, time_till });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    const payload = {
      jsonrpc: "2.0",
      method: "trigger.get",
      params: {
        output: ["triggerid", "description", "priority", "lastchange", "value"],
        filter: { value: 1 },
        expandDescription: true,
        selectHosts: ["hostid", "host", "name"],
        selectGroups: ["groupid", "name"],
        recent: true,
        time_from,
        time_till,
        sortorder: "ASC",
      },
      auth,
      id: 1,
    };

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
      },
      httpsAgent,
      timeout: 10000,
    });

    const data = response.data?.result || [];

    // ⭐ COUNT VALUES FOR CONSOLE — your screenshot values
    let counts = {
      disaster: 0,
      high: 0,
      average: 0,
      warning: 0,
      information: 0,
      not_classified: 0,
    };

    data.forEach((trigger: any) => {
      // ⭐ Print full object for WARNING (priority = 2)
      if (String(trigger.priority) === "2") {
        console.log("⚠️ FULL WARNING OBJECT:", trigger);
      }

      // Count priority
      switch (String(trigger.priority)) {
        case "5":
          counts.disaster++;
          break;
        case "4":
          counts.high++;
          break;
        case "3":
          counts.average++;
          break;
        case "2":
          counts.warning++;
          break;
        case "1":
          counts.information++;
          break;
        default:
          counts.not_classified++;
      }
    });

    // ⭐ YOUR COUNT LOGGING
    console.log("📊 Priority Counts:");
    console.log("Disaster:", counts.disaster);
    console.log("High:", counts.high);
    console.log("Average:", counts.average);
    console.log("Warning:", counts.warning);
    console.log("Information:", counts.information);
    console.log("Not classified:", counts.not_classified);

    // Return raw data as before
    return NextResponse.json({ result: data });

  } catch (error: any) {
    console.error("trigger.get error:", error.message);

    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
