export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (ch === "," && !insideQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current);
  return result.map((x) => x.trim());
}

function csvToJson(csvText: string) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? "";
    });
    return obj;
  });

  return { headers, rows };
}

export async function GET() {
  try {
    const reportsDir = path.join(process.cwd(), "public", "reports");

    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json(
        { ok: false, message: "reports folder not found", headers: [], rows: [] },
        { status: 404 }
      );
    }

    const files = fs
      .readdirSync(reportsDir)
      .filter((f) => f.startsWith("history_data_") && f.endsWith(".csv"))
      .map((f) => ({
        name: f,
        fullPath: path.join(reportsDir, f),
        mtime: fs.statSync(path.join(reportsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, message: "No history_data CSV found", headers: [], rows: [] },
        { status: 404 }
      );
    }

    const latest = files[0];
    const csvText = fs.readFileSync(latest.fullPath, "utf8");
    const parsed = csvToJson(csvText);

    return NextResponse.json({
      ok: true,
      fileName: latest.name,
      fileUrl: `/reports/${latest.name}`,
      headers: parsed.headers,
      rows: parsed.rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Server error", headers: [], rows: [] },
      { status: 500 }
    );
  }
}
