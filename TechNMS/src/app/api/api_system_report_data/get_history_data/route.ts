// import { NextResponse } from "next/server";
// import axios from "axios";
// import https from "https";

// /* ===================== ITEM NAMES (ORDERED) ===================== */

// const ITEM_NAMES = [
// //   'Interface ["GigabitEthernet0/0/0"]: Bits sent',
// //   'Interface ["GigabitEthernet0/0/0"]: Bits received',
// //   'Interface ["GigabitEthernet0/0/0"]: Speed',
//   "Memory utilization",
//   "CPU utilization",
// //   "Certificate validity",
// ];

// /* ===================== API ===================== */

// export async function POST(req: Request) {
//   try {
//     const { auth, groupids } = await req.json();

//     if (!auth) {
//       return NextResponse.json({ error: "Missing auth token" }, { status: 400 });
//     }

//     if (!groupids || !groupids.length) {
//       return NextResponse.json({ error: "Missing groupids" }, { status: 400 });
//     }

//     const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL as string;
//     const httpsAgent = new https.Agent({ rejectUnauthorized: false });

//     /* ===================== TIME RANGE (LAST 15 DAYS) ===================== */

//     const timeTill = Math.floor(Date.now() / 1000);
//     const timeFrom = timeTill - 15 * 24 * 60 * 60;

//     const fromDate = new Date(timeFrom * 1000).toISOString();
//     const toDate = new Date(timeTill * 1000).toISOString();

//     const finalResult: any[] = [];

//     /* ===================== PROCESS EACH ITEM NAME SEQUENTIALLY ===================== */

//     for (const ITEM_NAME of ITEM_NAMES) {
//       /* ---------- item.get ---------- */

//       const itemPayload = {
//         jsonrpc: "2.0",
//         method: "item.get",
//         params: {
//           output: ["itemid", "hostid", "name"],
//           groupids,
//           search: { name: ITEM_NAME },
//           searchByAny: true,
//           selectHosts: ["name"],
//         },
//         id: 1,
//       };

//       const itemRes = await axios.post(ZABBIX_URL, itemPayload, {
//         headers: {
//           "Content-Type": "application/json-rpc",
//           Authorization: `Bearer ${auth}`,
//         },
//         httpsAgent,
//       });

//       const items = itemRes.data?.result ?? [];
//       if (!items.length) continue;

//       const historyMap: Record<string, number[]> = {};

//       /* ---------- history.get (SEQUENTIAL per itemid) ---------- */

//       for (const item of items) {
//         try {
//           const historyPayload = {
//             jsonrpc: "2.0",
//             method: "history.get",
//             params: {
//               output: ["value"],
//               itemids: [item.itemid],
//               history: 0,
//               time_from: timeFrom,
//               time_till: timeTill,
//               sortfield: "clock",
//               sortorder: "DESC",
//             },
//             id: 2,
//           };

//           const historyRes = await axios.post(ZABBIX_URL, historyPayload, {
//             headers: {
//               "Content-Type": "application/json-rpc",
//               Authorization: `Bearer ${auth}`,
//             },
//             httpsAgent,
//           });

//           const history = historyRes.data?.result ?? [];

//           history.forEach((h: any) => {
//             const value = Number(h.value);
//             if (isNaN(value)) return;

//             if (!historyMap[item.itemid]) {
//               historyMap[item.itemid] = [];
//             }

//             historyMap[item.itemid].push(value);
//           });
//         } catch {
//           console.error(`history.get failed for itemid ${item.itemid}`);
//         }
//       }

//       /* ---------- AVERAGE (UNCHANGED LOGIC) ---------- */

//       items.forEach((item: any) => {
//         const values = historyMap[item.itemid] ?? [];

//         const avg =
//           values.length > 0
//             ? Number(
//                 (
//                   values.reduce((sum, v) => sum + v, 0) / values.length
//                 ).toFixed(2)
//               )
//             : null;

//         finalResult.push({
//           hostid: item.hostid,
//           hostname: item.hosts?.[0]?.name ?? "Unknown",
//           name: ITEM_NAME,
//           avg,
//         });
//       });
//     }

//     return NextResponse.json({
//       fromDate,
//       toDate,
//       result: finalResult,
//     });
//   } catch (e: any) {
//     console.error("System report error:", e?.response?.data || e?.message);
//     return NextResponse.json(
//       { error: "Server error fetching system report" },
//       { status: 500 }
//     );
//   }
// }
