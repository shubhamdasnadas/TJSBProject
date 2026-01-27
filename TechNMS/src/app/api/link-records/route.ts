import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const RECORDS_FILE = path.join(process.cwd(), "data", "link_records.json");
const SNAPSHOT_FILE = path.join(process.cwd(), "data", "link_last_snapshot.json");

function ensureFile(filePath: string, initialData: any) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(initialData, null, 2), "utf-8");
  }
}

function readJSON(filePath: string, fallback: any) {
  ensureFile(filePath, fallback);
  const raw = fs.readFileSync(filePath, "utf-8");
  return raw ? JSON.parse(raw) : fallback;
}

function writeJSON(filePath: string, data: any) {
  ensureFile(filePath, Array.isArray(data) ? [] : {});
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const records = readJSON(RECORDS_FILE, []);
    return NextResponse.json({ success: true, data: records });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to load records" },
      { status: 500 }
    );
  }
}

/**
 * ✅ Save new record ONLY if snapshot changed
 * This will allow:
 * DOWN -> UP -> DOWN = 3 records ✅
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const records = readJSON(RECORDS_FILE, []);
    const snapshotMap = readJSON(SNAPSHOT_FILE, {});

    const systemIp = body.systemIp || "NA";

    // ✅ snapshotKey MUST represent the CURRENT state
    // If changes => new record saved
    const snapshotKey =
      body.snapshotKey ||
      JSON.stringify({
        siteState: body.siteState || "NA",
        reachability: body.reachability || "NA",
        downTunnelNames: Array.isArray(body.downTunnels)
          ? body.downTunnels.map((t: any) => t.tunnelName).sort()
          : [],
      });

    const prevSnapshot = snapshotMap[systemIp];

    // ✅ If snapshot not changed => skip insert
    if (prevSnapshot === snapshotKey) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "No change detected, skipped insert",
      });
    }

    // ✅ Update snapshot
    snapshotMap[systemIp] = snapshotKey;
    writeJSON(SNAPSHOT_FILE, snapshotMap);

    // ✅ Insert record (LATEST ON TOP)
    const newRecord = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),

      generatedAtUTC: body.generatedAtUTC || null,
      generatedAtIST: body.generatedAtIST || null,

      systemIp,
      hostname: body.hostname || "NA",
      reachability: body.reachability || "NA",
      siteState: body.siteState || "NA",

      // ✅ Store down tunnels list (can be empty if recovered)
      downTunnels: Array.isArray(body.downTunnels) ? body.downTunnels : [],

      // ✅ eventType is helpful for UI
      eventType: body.eventType || "STATE_CHANGE",
    };

    records.unshift(newRecord);
    writeJSON(RECORDS_FILE, records);

    return NextResponse.json({ success: true, data: newRecord });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save record" },
      { status: 500 }
    );
  }
}
