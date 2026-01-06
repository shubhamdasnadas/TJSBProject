import { NextResponse } from "next/server";

const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Bearer token" },
        { status: 401 }
      );
    }

    const { itemid, history = 0, limit = 100 } = await req.json();

    if (!itemid) {
      return NextResponse.json(
        { error: "itemid is required" },
        { status: 400 }
      );
    }

    const body = {
      jsonrpc: "2.0",
      method: "history.get",
      params: {
        output: "extend",
        history,
        itemids: [itemid],
        sortfield: "clock",
        sortorder: "DESC",
        limit,
      },
      id: 1,
    };

    const res = await fetch(ZABBIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json-rpc",
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    console.error("zabbix-history error:", err);
    return NextResponse.json(
      { error: "history.get failed" },
      { status: 500 }
    );
  }
}
