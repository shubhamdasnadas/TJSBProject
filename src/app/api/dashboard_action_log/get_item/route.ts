import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
    try {
        const { hostids, auth } = await req.json();

        if (!auth) {
            return NextResponse.json(
                { error: "Missing Zabbix auth token" },
                { status: 400 }
            );
        }

        if (!hostids) {
            return NextResponse.json(
                { error: "Missing hostids" },
                { status: 400 }
            );
        }

        const httpsAgent = new https.Agent({
            rejectUnauthorized: false, // for self-signed cert
        });

        const ZABBIX_URL =
            process.env.NEXT_PUBLIC_ZABBIX_URL as string;

        const payload = {
            jsonrpc: "2.0",
            method: "item.get",
            params: {
                output: "extend",
                hostids: Array.isArray(hostids) ? hostids : [hostids],
                sortfield: "name",
            },
            id: 1,
        };

        const response = await axios.post(ZABBIX_URL, payload, {
            headers: {
                "Content-Type": "application/json-rpc",
                Authorization: `Bearer ${auth}`
            },
            httpsAgent,
            timeout: 10000,
        });

        if (response.data?.result) {
            return NextResponse.json({
                result: response.data.result,
            });
        }

        return NextResponse.json(
            {
                error: response.data?.error || "Zabbix rejected the request",
            },
            { status: 403 }
        );
    } catch (error: any) {
        console.error("item.get API error:", error.message);

        return NextResponse.json(
            { error: "Server error: Unable to reach Zabbix API" },
            { status: 500 }
        );
    }
}
