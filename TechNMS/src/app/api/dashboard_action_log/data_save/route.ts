import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "data", "dashboard.json");

export async function GET() {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({
      layout: [],
      dynamicWidgets: [],
      removedStatic: [],
    });
  }
}

export async function POST(req: Request) {
  const body = await req.json();

  // make sure /data folder exists
  const dir = path.join(process.cwd(), "data");
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}

  await fs.writeFile(filePath, JSON.stringify(body, null, 2), "utf8");

  return NextResponse.json({ success: true });
}
