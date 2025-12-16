import { NextResponse } from "next/server";
import axios, { AxiosError } from "axios";
import https from "https";

export async function POST(req: Request) {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });

  try {
    const { names = [], auth = "" } = await req.json();

    if (!auth) {
      return NextResponse.json(
        { error: "Missing Zabbix auth token." },
        { status: 400 }
      );
    }

    const ZABBIX_URL =
      process.env.ZABBIX_URL ??
      "https://192.168.0.252/monitor/api_jsonrpc.php";

    // Build params - only add filter if names are provided
    const params: any = {
      output: "extend",
    };
    
    // Only filter by name if names array is provided and not empty
    if (Array.isArray(names) && names.length > 0) {
      params.filter = { name: names };
    }

    const payload = {
      jsonrpc: "2.0",
      method: "hostgroup.get",
      params,
      id: 1,
    };

    console.log("hostgroup.get request:", JSON.stringify(payload, null, 2));

    const response = await axios.post(ZABBIX_URL, payload, {
      httpsAgent,
      timeout: 10000,
      headers: {
        "Content-Type": "application/json-rpc",
        "Authorization": `Bearer ${auth}`,
        Host: "192.168.0.252",
        Referer: "https://192.168.0.252",
        Origin: "https://192.168.0.252",
      },
    });

    if (response.data?.result) {
      return NextResponse.json({ result: response.data.result });
    }

    return NextResponse.json(
      { error: response.data?.error ?? "Zabbix API returned an error." },
      { status: 403 }
    );

  } catch (error) {
    let message = "An unknown error occurred.";
    let status = 500;

    if (error instanceof AxiosError) {
      if (error.response) {
        message =
          error.response.data?.error ??
          `Zabbix API error with status ${error.response.status}.`;
        status = error.response.status;
      } else if (error.request) {
        message = "No response received from Zabbix API.";
        status = 503;
      } else {
        message = `Axios error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    console.error("Zabbix API error:", message);

    return NextResponse.json({ error: message }, { status });
  }
}
