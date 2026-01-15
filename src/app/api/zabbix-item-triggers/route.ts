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


// import { NextResponse } from "next/server";

// const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

// type Trigger = {
//   triggerid: string;
//   description?: string;
//   priority?: number;
// };

// type TriggerEvent = {
//   clock: number | string;
//   objectid: string;
//   severity?: number;
//   value?: number;
// };

// export async function POST(req: Request) {
//   try {
//     /* =========================
//        AUTH
//     ========================= */
//     const auth = req.headers.get("authorization");
//     if (!auth || !auth.startsWith("Bearer ")) {
//       return NextResponse.json(
//         { error: "Missing Bearer token" },
//         { status: 401 }
//       );
//     }

//     /* =========================
//        INPUT
//     ========================= */
//     const {
//       itemid,
//       time_from,
//       time_till,

//       // 🔥 history object types (optional)
//       historyTypes = [0, 1, 2, 3, 4, 5],
//     } = await req.json();

//     if (!itemid) {
//       return NextResponse.json(
//         { error: "itemid is required" },
//         { status: 400 }
//       );
//     }

//     /* =========================
//        1️⃣ trigger.get (item scoped)
//     ========================= */
//     const triggerBody = {
//       jsonrpc: "2.0",
//       method: "trigger.get",
//       params: {
//         output: ["triggerid", "description", "priority"],
//         itemids: [itemid],
//         filter: {
//           status: 0, // enabled only
//         },
//       },
//       id: 1,
//     };

//     const triggerRes = await fetch(ZABBIX_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json-rpc",
//         Authorization: auth,
//       },
//       body: JSON.stringify(triggerBody),
//     });

//     const triggerJson = await triggerRes.json();
//     const triggers: Trigger[] = triggerJson.result ?? [];
//     const triggerIds = triggers.map((t) => t.triggerid);

//     /* =========================
//        No triggers → valid case
//     ========================= */
//     if (!triggerIds.length) {
//       return NextResponse.json({
//         triggers: [],
//         events: [],
//         historyTypes, // forwarded
//       });
//     }

//     /* =========================
//        2️⃣ event.get (trigger fires)
//     ========================= */
//     const eventBody = {
//       jsonrpc: "2.0",
//       method: "event.get",
//       params: {
//         output: ["clock", "objectid"],
//         object: 0,            // trigger events
//         value: 1,             // PROBLEM only
//         objectids: triggerIds,
//         ...(time_from && { time_from }),
//         ...(time_till && { time_till }),
//         sortfield: ["clock"],
//         sortorder: "ASC",
//       },
//       id: 2,
//     };

//     const eventRes = await fetch(ZABBIX_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json-rpc",
//         Authorization: auth,
//       },
//       body: JSON.stringify(eventBody),
//     });

//     const eventJson = await eventRes.json();

//     /* =========================
//        Enrich events with trigger info for frontend overlay
//     ========================= */
//     const triggerMap = new Map<string, Trigger>(
//       triggers.map((t) => [t.triggerid, t])
//     );

//     const events = (eventJson.result as TriggerEvent[] ?? []).map((e) => {
//       const trg = triggerMap.get(e.objectid);
//       return {
//         ...e,
//         clock: Number(e.clock),
//         triggerName: trg?.description,
//         severity: trg?.priority ?? e.severity,
//       };
//     });

//     /* =========================
//        RESPONSE
//     ========================= */
//     return NextResponse.json({
//       triggers,
//       events,

//       // 🔥 forward supported history object types
//       historyTypes,
//     });
//   } catch (err) {
//     console.error("zabbix-item-triggers error:", err);
//     return NextResponse.json(
//       { error: "zabbix-item-triggers failed" },
//       { status: 500 }
//     );
//   }
// }
