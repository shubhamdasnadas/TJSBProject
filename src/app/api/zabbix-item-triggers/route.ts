import { NextResponse } from "next/server";


const ZABBIX_URL =
  "https://tjsb-nms.techsecdigital.com/monitor/api_jsonrpc.php";


const API_TOKEN =
  "60072263f8732381e8e87c7dc6655995d28742aea390672350f11d775f1ca5fc";


let requestId = 1;


async function zbxCall(method: string, params: any) {
  const payload = {
    jsonrpc: "2.0",
    method,
    params,
    id: requestId++,
  };


  const res = await fetch(ZABBIX_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify(payload),
  });


  const data = await res.json();


  if (data.error) {
    throw new Error(data.error.data || "Zabbix API Error");
  }


  return data.result;
}


export async function POST(req: Request) {
  try {
    const { itemId, timeFrom, timeTill } = await req.json();


    /* ======================
       ITEM DETAILS
    ====================== */
    const [item] = await zbxCall("item.get", {
      itemids: itemId,
      output: ["name", "value_type", "units"],
    });


    const valueType = Number(item.value_type);


    if (![0, 3].includes(valueType)) {
      return NextResponse.json(
        { error: "Item is not numeric" },
        { status: 400 }
      );
    }


    /* ======================
       ITEM HISTORY
    ====================== */
    const history = await zbxCall("history.get", {
      itemids: itemId,
      history: valueType,
      time_from: timeFrom,
      time_till: timeTill,
      output: "extend",
      sortfield: "clock",
      sortorder: "ASC",
    });


    /* ======================
       TRIGGERS
    ====================== */
    const triggers = await zbxCall("trigger.get", {
      output: ["triggerid", "description"],
      itemids: itemId,
      filter: { status: 0 },
    });


    const triggerIds = triggers.map((t: any) => t.triggerid);


    /* ======================
       EVENTS
    ====================== */
    let events: any[] = [];


    if (triggerIds.length) {
      events = await zbxCall("event.get", {
        object: 0,
        objectids: triggerIds,
        value: 1,
        time_from: timeFrom,
        time_till: timeTill,
        output: ["eventid", "clock", "objectid"],
      });
    }


    return NextResponse.json({
      itemName: item.name,
      units: item.units || "",
      history: history.map((h: any) => ({
        time: Number(h.clock) * 1000,
        value: Number(h.value),
      })),
      events: events.map((e: any) => ({
        time: Number(e.clock) * 1000,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
