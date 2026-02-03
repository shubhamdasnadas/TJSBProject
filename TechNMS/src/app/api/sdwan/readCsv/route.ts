import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const CSV_FILE = path.join(DATA_DIR, "sdwan_tunnel_report.csv");

function parseCsvText(csvText: string) {
    if (!csvText) return [];

    const lines = csvText.split("\n").filter(Boolean);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const dataLines = lines.slice(1);

    const rows: any[] = [];

    for (const line of dataLines) {
        const values: string[] = [];
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
                values.push(current);
                current = "";
                continue;
            }

            current += ch;
        }

        values.push(current);

        const obj: any = {};
        headers.forEach((h, idx) => {
            obj[h] = values[idx] ?? "";
        });

        rows.push(obj);
    }

    return rows;
}

/* ✅ convert "dd-mm-yyyy hh:mm:ss" -> time number for sorting */
function toTime(text: string) {
    try {
        if (!text) return 0;
        const [datePart, timePart] = text.split(" ");
        if (!datePart || !timePart) return 0;

        const [dd, mm, yyyy] = datePart.split("-").map(Number);
        const [hh, min, ss] = timePart.split(":").map(Number);

        const d = new Date(yyyy, mm - 1, dd, hh, min, ss);
        return d.getTime();
    } catch {
        return 0;
    }
}

export async function GET() {
    try {
        if (!fs.existsSync(CSV_FILE)) {
            return NextResponse.json({
                success: true,
                rows: [],
                debug: { exists: false, csvFile: CSV_FILE },
            });
        }

        const csvText = fs.readFileSync(CSV_FILE, "utf-8");
        const rows = parseCsvText(csvText);

        rows.sort((a: any, b: any) => toTime(b?.["Last Updated"]) - toTime(a?.["Last Updated"]));

        return NextResponse.json({
            success: true,
            rows,
            debug: {
                exists: true,
                csvFile: CSV_FILE,
                totalRows: rows.length,
            },
        });
    } catch (err: any) {
        return NextResponse.json(
            { success: false, error: err?.message || "CSV read failed" },
            { status: 500 }
        );
    }
}