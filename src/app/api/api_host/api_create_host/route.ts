import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const {
      host,
      interfaces = [],       // safe defaults
      groups = [],
      tags = [],
      macros = [],
      inventory = {},
      auth
    } = await req.json();

    /* ======================================================
       FIX 1: Zabbix requires at least ONE group always
       If frontend sends no groups → use default group "4"
    ======================================================= */
    const safeGroups =
      Array.isArray(groups) && groups.length > 0 ? groups : ["4"];

    const formattedGroups = safeGroups.map((g: string) => ({
      groupid: g,
    }));

    /* ======================================================
       FIX 2: Safe interfaces array
    ======================================================= */
    const formattedInterfaces = interfaces.map((item: any) => ({
      type: Number(item.type),
      main: Number(item.main),
      useip: Number(item.useip),
      ip: item.ip,
      dns: item.dns,
      port: item.port,
    }));

    /* ======================================================
       FIX 3: Default Tags (Zabbix requires valid structure)
    ======================================================= */
    const fixedTags =
      tags.length > 0
        ? tags
        : [{ tag: "host-name", value: host }];

    /* ======================================================
       FIX 4: Default Macros
    ======================================================= */
    const fixedMacros =
      macros.length > 0
        ? macros
        : [
          { macro: "{$USER_ID}", value: "123321" },
          {
            macro: "{$USER_LOCATION}",
            value: "0:0:0",
            description: "latitude, longitude and altitude coordinates",
          },
        ];

    /* ======================================================
       FIX 5: Default Inventory
    ======================================================= */
    const fixedInventory =
      Object.keys(inventory).length > 0
        ? inventory
        : {
          macaddress_a: "01234",
          macaddress_b: "56768",
        };

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL =
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    /* ======================================================
       FINAL PAYLOAD (Fully Valid for Zabbix)
    ======================================================= */
    const payload = {
      jsonrpc: "2.0",
      method: "host.create",
      params: {
        host,
        interfaces: formattedInterfaces,
        groups: formattedGroups,
        tags: fixedTags,
        macros: fixedMacros,
        inventory_mode: 0,
        inventory: fixedInventory,
      },
      auth,
      id: 1,
    };

    console.log("ZABBIX PAYLOAD:", JSON.stringify(payload, null, 2));

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
      timeout: 10000,
    });

    if (response.data?.result) {
      return NextResponse.json({ result: response.data.result });
    }

    return NextResponse.json(
      { error: response.data?.error || "Zabbix rejected request" },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("host.create error:", error.message);
    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
