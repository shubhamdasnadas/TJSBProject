import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { auth, startDate, startTime, endDate, endTime, groupids } =
      await req.json();

    if (!auth) {
      return NextResponse.json(
        { error: "Missing Zabbix auth token" },
        { status: 401 }
      );
    }

    const httpsAgent = new https.Agent({ rejectUnauthorized: false });

    /* ===================== TIME RANGE ===================== */
    const time_from = Math.floor(
      new Date(`${startDate} ${startTime}`).getTime() / 1000
    );
    const time_till = Math.floor(
      new Date(`${endDate} ${endTime}`).getTime() / 1000
    );

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    /* ===================== STEP 1: GET EVENTS ===================== */
    const eventPayload = {
      jsonrpc: "2.0",
      method: "event.get",
      params: {
        output: ["eventid", "clock", "severity", "objectid"],
        time_from,
        time_till,
        value: 1, // PROBLEM events only
        groupids: Array.isArray(groupids) && groupids.length ? groupids : [],
        selectHosts: ["hostid", "name"],
        sortfield: "clock",
        sortorder: "DESC",
      },
      auth,
      id: 1,
    };

    const eventResponse = await axios.post(ZABBIX_URL, eventPayload, {
      headers: { "Content-Type": "application/json-rpc" },
      httpsAgent,
      timeout: 10000,
    });

    const events = eventResponse.data?.result || [];

    if (!events.length) {
      return NextResponse.json({
        countsByGroup: {},
        events: [],
      });
    }

    /* ===================== STEP 2: COLLECT HOST IDS ===================== */
    const hostIds = new Set<string>();

    events.forEach((event: any) => {
      event.hosts?.forEach((h: any) => hostIds.add(h.hostid));
    });

    /* ===================== STEP 3: GET HOST GROUPS ===================== */
    const hostPayload = {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        hostids: Array.from(hostIds),
        output: ["hostid"],
        selectGroups: ["groupid", "name"],
      },
      auth,
      id: 2,
    };

    const hostResponse = await axios.post(ZABBIX_URL, hostPayload, {
      headers: { "Content-Type": "application/json-rpc" },
      httpsAgent,
      timeout: 10000,
    });

    const hosts = hostResponse.data?.result || [];

    /* ===================== MAP HOST → GROUPS ===================== */
    const hostGroupMap: Record<string, string[]> = {};

    hosts.forEach((host: any) => {
      hostGroupMap[host.hostid] = host.groups.map(
        (g: any) => g.name
      );
    });

    /* ===================== AGGREGATE BY HOST GROUP ===================== */
    const countsByGroup: Record<
      string,
      {
        disaster: number;
        high: number;
        average: number;
        warning: number;
        information: number;
        not_classified: number;
      }
    > = {};

    events.forEach((event: any) => {
      const severity = String(event.severity);

      event.hosts?.forEach((host: any) => {
        const groups = hostGroupMap[host.hostid] || ["Unknown Group"];

        groups.forEach((groupName) => {
          if (!countsByGroup[groupName]) {
            countsByGroup[groupName] = {
              disaster: 0,
              high: 0,
              average: 0,
              warning: 0,
              information: 0,
              not_classified: 0,
            };
          }

          switch (severity) {
            case "5":
              countsByGroup[groupName].disaster++;
              break;
            case "4":
              countsByGroup[groupName].high++;
              break;
            case "3":
              countsByGroup[groupName].average++;
              break;
            case "2":
              countsByGroup[groupName].warning++;
              break;
            case "1":
              countsByGroup[groupName].information++;
              break;
            default:
              countsByGroup[groupName].not_classified++;
              break;
          }
        });
      });
    });

    /* ===================== RESPONSE ===================== */
    return NextResponse.json({
      countsByGroup,
      events, // optional raw events
      meta: {
        total_events: events.length,
        time_from,
        time_till,
      },
    });
  } catch (error: any) {
    console.error("❌ event.get error:", error.message || error);

    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
