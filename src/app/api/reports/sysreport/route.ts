import { NextResponse } from 'next/server';

const ZABBIX_URL = "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";
const TOKEN =  "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";

async function zabbix(body: any) {
  const r = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-rpc",
      "Authorization": "Bearer " + TOKEN
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    throw new Error(`Zabbix API request failed with status ${r.status}`);
  }
  return r.json();
}

export async function GET() {
  try {
    const [problemRes, hostRes, eventRes] = await Promise.all([
      zabbix({
        jsonrpc: "2.0",
        method: "problem.get",
        params: {
          output: ["eventid", "clock", "r_clock", "severity", "acknowledged", "name"],
          // recent: true,
          sortfield: "eventid",
          sortorder: "DESC"
        },
        id: 1
      }),
      zabbix({
        jsonrpc: "2.0",
        method: "host.get",
        params: {
          output: ["hostid", "name"]
        },
        id: 3
      }),
      zabbix({
        jsonrpc: "2.0",
        method: "event.get",
        params: {
          output: ["eventid"],
          selectHosts: ["hostid"],
          selectAcknowledges: ["message"],
          // recent: true,
          sortfield: "eventid",
          sortorder: "DESC"
        },
        id: 7
      })
    ]);

    if (problemRes.error || hostRes.error || eventRes.error) {
        let errors = [];
        if(problemRes.error) errors.push(`Problem API Error: ${problemRes.error.data}`);
        if(hostRes.error) errors.push(`Host API Error: ${hostRes.error.data}`);
        if(eventRes.error) errors.push(`Event API Error: ${eventRes.error.data}`);
        throw new Error(errors.join(', '));
    }

    const hostMap = new Map(hostRes.result.map((h: any) => [h.hostid, h.name]));
    const messageMap = new Map(eventRes.result.map((e: any) => [e.eventid, e.acknowledges?.[0]?.message ?? "-"]));
    const eventHostMap = new Map(eventRes.result.map((e: any) => [e.eventid, e.hosts?.[0]?.hostid]));

    const data = problemRes.result.map((p: any) => {
      const time = new Date(p.clock * 1000).toLocaleString();
      const status = p.r_clock && p.r_clock !== '0' ? "Resolved" : "Problem";
      
      let duration;
      if (p.r_clock && p.r_clock !== '0') {
          duration = (p.r_clock - p.clock) + " sec";
      } else {
          duration = (Math.floor(Date.now() / 1000) - p.clock) + " sec";
      }

      const ack = p.acknowledged === "1" ? "Yes" : "No";
      const hostid = eventHostMap.get(p.eventid);
      const host = hostid ? hostMap.get(hostid) ?? "Unknown Host" : "Unknown Host";
      const message = messageMap.get(p.eventid) ?? p.name;

      return {
        time,
        status,
        host,
        severity: p.severity,
        duration,
        ack,
        message,
        eventid: p.eventid
      };
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}