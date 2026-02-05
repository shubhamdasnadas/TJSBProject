import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const file = path.join(process.cwd(), "data/system_report_status.json");
  if (!fs.existsSync(file)) {
    return NextResponse.json({ status: "IDLE", progress: 0 });
  }
  return NextResponse.json(JSON.parse(fs.readFileSync(file, "utf8")));
}
