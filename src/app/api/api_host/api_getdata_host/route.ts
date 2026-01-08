import { NextResponse } from "next/server";
import axios from "axios";
import https from "https";

export async function POST(req: Request) {
    try {
        const { groupid, auth } = await req.json();

        const httpsAgent = new https.Agent({
            rejectUnauthorized: false,
        });

        const ZABBIX_URL =
            process.env.NEXT_PUBLIC_ZABBIX_URL ||
            "https://192.168.0.252/monitor/api_jsonrpc.php";

        const payload = {
            jsonrpc: "2.0",
            method: "host.get",
            params: {
                groupids: groupid,
                output: ["hostid", "host", "status", "active_available", "monitored_by"],
                selectInterfaces: ["interfaceid", "ip", "dns", "port", "type", "available"],
                selectTags: ["tag", "value"]
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
            const updatedHosts = response.data.result.map((host: any) => {
                const interfaces = host.interfaces || [];

                // ⭐ Pick last interface (latest)
                const latest = interfaces[interfaces.length - 1] || null;

                // ⭐ Inject active_available inside latest interface
                if (latest) {
                    latest.active_available = host.active_available;
                }

                return {
                    hostid: host.hostid,
                    host: host.host,
                    status: host.status,
                    latest_interface: latest,
                    latest_ip: latest?.ip || null,
                };
            });

            return NextResponse.json({ result: updatedHosts });
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
