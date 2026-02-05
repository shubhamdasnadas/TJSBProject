export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/* ================= CSV PARSER ================= */

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out.map((x) => x.trim());
}

function csvToJson(csv: string) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((l) => {
    const values = parseCsvLine(l);
    const obj: Record<string, any> = {};
    headers.forEach((h, i) => (obj[h] = values[i] ?? ""));
    return obj;
  });

  return { headers, rows };
}

/* ================= API ================= */

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), "data");

    if (!fs.existsSync(dataDir)) {
      return NextResponse.json({ headers: [], rows: [] });
    }

    const files = fs
      .readdirSync(dataDir)
      .filter((f) => f.startsWith("history_") && f.endsWith(".csv"))
      .map((f) => ({
        name: f,
        full: path.join(dataDir, f),
        mtime: fs.statSync(path.join(dataDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (!files.length) {
      return NextResponse.json({ headers: [], rows: [] });
    }

    const csvText = fs.readFileSync(files[0].full, "utf8");
    const parsed = csvToJson(csvText);

    return NextResponse.json({
      ok: true,
      fileName: files[0].name,
      headers: parsed.headers,
      rows: parsed.rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, headers: [], rows: [], message: e?.message },
      { status: 500 }
    );
  }
}
