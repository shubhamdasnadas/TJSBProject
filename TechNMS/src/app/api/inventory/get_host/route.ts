import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { groupid, auth } = await req.json();

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;

    // =========================
    // ZABBIX PAYLOAD (UPDATED)
    // =========================
    const payload = {
      jsonrpc: "2.0",
      method: "host.get",
      params: {
        groupids: groupid, // keep if filtering by group
        output: ["hostid", "host", "name"],
        selectHostGroups: ["name"],
        selectInventory: ["os", "serialno_a"],
        sortfield: "host",
        sortorder: "ASC",
      },
      id: 1,
    };

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: `Bearer ${auth}`,
      },
      httpsAgent,
    });

    if (response.data?.result) {
      // =========================
      // FRONTEND-FRIENDLY FORMAT
      // =========================
      const hosts = response.data.result.map((host: any) => ({
        hostid: host.hostid,
        host: host.host,
        hostName: host.name,
        hostGroups: host.hostgroups ?? [],
        inventory: host.inventory ?? {},
      }));

      return NextResponse.json({ result: hosts });
    }

    return NextResponse.json(
      { error: response.data?.error || "Zabbix rejected request" },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("host.get error:", error.message);

    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
