import axios from "axios";
import { NextResponse } from "next/server";

const BASE = "https://vmanage-31949190.sdwan.cisco.com";
const CONCURRENCY = 8; // max safe for vManage

export async function POST() {
  try {
    const user = process.env.VMANAGE_USER!;
    const pass = process.env.VMANAGE_PASS!;

    /* ---------------- LOGIN ---------------- */
    const loginRes = await axios.post(
      `${BASE}/j_security_check`,
      `j_username=${user}&j_password=${pass}`,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const cookieHeader = (loginRes.headers["set-cookie"] || [])
      .map((c: string) => c.split(";")[0])
      .join("; ");

    if (!cookieHeader) {
      throw new Error("Login failed – no session cookie");
    }

    /* ---------------- CSRF TOKEN ---------------- */
    const tokenRes = await axios.get(`${BASE}/dataservice/client/token`, {
      headers: { Cookie: cookieHeader },
    });

    const token = tokenRes.data || "";

    /* ---------------- AXIOS SESSION ---------------- */
    const vmanage = axios.create({
      baseURL: BASE,
      headers: {
        Cookie: cookieHeader,
        "X-XSRF-TOKEN": token,
      },
      timeout: 15000,
    });

    /* ---------------- DEVICE INVENTORY ---------------- */
    const deviceRes = await vmanage.get("/dataservice/device");
    const devices = deviceRes.data?.data || [];

    /* ---------------- FILTER WAN EDGES ---------------- */
    const wanEdges = devices.filter(
      (d: any) =>
        ["vedge", "cedge"].includes(d["device-type"]) &&
        d["reachability"] === "reachable" &&
        d["system-ip"]
    );

    const deviceMap = new Map<string, string>(
      wanEdges.map((d: any) => [d["system-ip"], d["host-name"]])
    );

    const systemIps = Array.from(deviceMap.keys());

    /* ---------------- CONCURRENCY WORKERS ---------------- */
    const results: any[] = [];
    let index = 0;

    const worker = async () => {
      while (true) {
        const systemIp = systemIps[index++];
        if (!systemIp) break;

        try {
          const res = await vmanage.get(
            `/dataservice/device/bfd/sessions?deviceId=${systemIp}`
          );

          results.push({
            systemIp,
            hostname: deviceMap.get(systemIp),
            sessions: res.data?.data || [],
          });
        } catch {
          results.push({
            systemIp,
            hostname: deviceMap.get(systemIp),
            sessions: [],
          });
        }
      }
    };

    await Promise.all(
      Array.from({ length: CONCURRENCY }, () => worker())
    );

    /* ---------------- DEVICE-WISE TUNNEL OUTPUT ---------------- */
    const deviceWiseTunnels: Record<string, any[]> = {};

    for (const d of results) {
      deviceWiseTunnels[d.systemIp] = (d.sessions || []).map((s: any) => ({
        // 🔑 Tunnel identity
        tunnelName: `${d.systemIp}:${s["local-color"]} → ${s["system-ip"]}:${s["color"]}`,

        // 🔑 Endpoint details
        localSystemIp: d.systemIp,
        remoteSystemIp: s["system-ip"],
        localColor: s["local-color"],
        remoteColor: s["color"],

        // 🔑 Status
        state: s.state,

        // 🔥 UPTIME DETAILS (IPsec tunnel uptime)
        uptime: s.uptime,                 // e.g. "0:12:26:50"
        uptimeEpoch: s["uptime-date"],    // epoch when tunnel came UP
        lastUpdated: s.lastupdated,        // last refresh time

        // Optional diagnostics
        transitions: s.transitions,
        protocol: s.proto,                // should be "ipsec"
      }));
    }

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      success: true,
      totalEdges: systemIps.length,
      devices: deviceWiseTunnels,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || err,
      },
      { status: 500 }
    );
  }
}
