import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
  try {
    const { names, auth } = await req.json();

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
    });

    const ZABBIX_URL =
<<<<<<< HEAD
      process.env.NEXT_PUBLIC_ZABBIX_URL ||
      "http://localhost:8080/api_jsonrpc.php";

    // Build params - only add filter if names are provided
    const params: any = {
      output: "extend",
    };
    
    // Only filter by name if names array is provided and not empty
    if (Array.isArray(names) && names.length > 0) {
      params.filter = { name: names };
    }
=======
      process.env.NEXT_PUBLIC_ZABBIX_URL as string;
>>>>>>> source/tablex

    const payload = {
      jsonrpc: "2.0",
      method: "hostgroup.get",
<<<<<<< HEAD
      params,
=======
      params: {
        output: "extend",
      },
>>>>>>> source/tablex
      id: 1,
    };

    console.log("hostgroup.get request:", JSON.stringify(payload, null, 2));

    const response = await axios.post(ZABBIX_URL, payload, {
      headers: {
        "Content-Type": "application/json-rpc",
<<<<<<< HEAD
        "Authorization": `Bearer ${auth}`,
=======
      
        Authorization: `Bearer ${auth}`,
>>>>>>> source/tablex
      },
      timeout: 10000,
    });
<<<<<<< HEAD
    console.log("hostgroup.get response:", response.data);
    // SUCCESS — Return result
=======

    console.log("templategroup.get response:", response.data);

>>>>>>> source/tablex
    if (response.data?.result) {
      return NextResponse.json({ result: response.data.result });
    }

    return NextResponse.json(
      { error: response.data?.error || "Zabbix rejected the request" },
      { status: 403 }
    );
  } catch (error: any) {
    console.error("templategroup.get error:", error.message);

    return NextResponse.json(
      { error: "Server error: Could not reach Zabbix API." },
      { status: 500 }
    );
  }
}
