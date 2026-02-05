import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { ISP_BRANCHES } from "../../../(DashboardLayout)/availability/data/data";
import branches from "../../../(DashboardLayout)/availability/data/data";

/* ===================== CONFIG ===================== */

const DATA_FILE = "/home/ec2-user/sdwan_tunnels.json";
// const DATA_FILE = "C:\\Users\\shaila\\OneDrive\\Desktop\\sdwan_tunnels.json";
// const DATA_FILE = "C:\\Users\\admin\\Desktop\\sdwan_tunnels.json";
const DATA_DIR = path.join(process.cwd(), "data");
const ALERT_STATE_FILE = path.join(DATA_DIR, "alert_state.json");

/* ✅ CSV FILE PATH */
const CSV_FILE = path.join(DATA_DIR, "sdwan_tunnel_report.csv");

/* ===================== HELPERS ===================== */

function ensureDirExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function getBranchName(hostname: string) {
    if (!hostname) return "NA";
    const found = branches.find((b: any) =>
        hostname.toLowerCase().includes(String(b.code || "").toLowerCase())
    );
    return found?.name || "NA";
}

function replaceISPNames(text: string) {
    if (!text) return text;

    let result = text;
    ISP_BRANCHES.forEach((isp: any) => {
        const regex = new RegExp(isp.type, "gi");
        result = result.replace(regex, isp.name);
    });

    return result;
}

function formatDateTime(ms: number) {
    const d = new Date(ms);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

function formatGeneratedAt(input: any) {
    try {
        if (!input) return "";

        // ✅ if already string like: "2026-01-23 14:57:52 IST"
        if (typeof input === "string") {
            const match = input.trim().match(
                /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/
            );

            if (match) {
                const yyyy = match[1];
                const mm = match[2];
                const dd = match[3];
                const hh = match[4];
                const min = match[5];
                const ss = match[6];

                return `${yyyy}-${mm}-${dd}  ${hh}-${min}-${ss}`;
            }

            return input;
        }

        // ✅ fallback for Date/number values
        const d = new Date(input);
        if (isNaN(d.getTime())) return "";

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        const ss = String(d.getSeconds()).padStart(2, "0");

        return `${yyyy}-${mm}-${dd}  ${hh}-${min}-${ss}`;
    } catch {
        return "";
    }
}

/* ===================== ALERT STATE (TUNNEL LEVEL) ===================== */
/**
 * key = systemIp||tunnelName
 * value = "up" | "down" | "partial"
 */
function loadAlertState(): Record<string, string> {
    try {
        ensureDirExists(DATA_DIR);
        if (!fs.existsSync(ALERT_STATE_FILE)) return {};
        return JSON.parse(fs.readFileSync(ALERT_STATE_FILE, "utf-8"));
    } catch {
        return {};
    }
}

function saveAlertState(state: Record<string, string>) {
    ensureDirExists(DATA_DIR);
    fs.writeFileSync(ALERT_STATE_FILE, JSON.stringify(state, null, 2));
}

/* ===================== CSV HELPERS ===================== */

const CSV_HEADERS = ["Last Updated", "Branch", "System IP", "Hostname", "Tunnel", "State", "Type"];

function escapeCsvValue(value: any) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function ensureCsvCreatedWithHeader() {
    ensureDirExists(DATA_DIR);

    // ✅ create CSV if not exists
    if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, CSV_HEADERS.join(",") + "\n", "utf-8");
        return;
    }

    // ✅ if exists but empty -> add header
    const content = fs.readFileSync(CSV_FILE, "utf-8");
    if (!content.trim()) {
        fs.writeFileSync(CSV_FILE, CSV_HEADERS.join(",") + "\n", "utf-8");
        return;
    }

    // ✅ if first line is not header -> prepend header (your current issue)
    const firstLine = content.split("\n")[0]?.trim() || "";
    if (firstLine !== CSV_HEADERS.join(",")) {
        fs.writeFileSync(CSV_FILE, CSV_HEADERS.join(",") + "\n" + content.trim() + "\n", "utf-8");
    }
}

function readCsvRows(): any[] {
    try {
        ensureCsvCreatedWithHeader();

        const csvText = fs.readFileSync(CSV_FILE, "utf-8");
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
    } catch {
        return [];
    }
}

function appendCsvRows(newRows: any[]) {
    ensureCsvCreatedWithHeader();

    const oldRows = readCsvRows();

    // ✅ prevent duplicates (same tunnel, same state, same lastUpdated, same type)
    const existingKey = new Set(
        oldRows.map(
            (r: any) =>
                `${r["System IP"]}_${r["Tunnel"]}_${r["State"]}_${r["Last Updated"]}_${r["Type"]}`
        )
    );

    const filtered = newRows.filter((r: any) => {
        const key = `${r["System IP"]}_${r["Tunnel"]}_${r["State"]}_${r["Last Updated"]}_${r["Type"]}`;
        return !existingKey.has(key);
    });

    if (filtered.length === 0) return { appended: 0, total: oldRows.length };

    const lines =
        filtered
            .map((r: any) => CSV_HEADERS.map((h) => escapeCsvValue(r?.[h] ?? "")).join(","))
            .join("\n") + "\n";

    fs.appendFileSync(CSV_FILE, lines, "utf-8");

    return { appended: filtered.length, total: oldRows.length + filtered.length };
}

/* ===================== API ===================== */

export async function GET() {
    try {
        ensureCsvCreatedWithHeader();

        const raw = fs.readFileSync(DATA_FILE, "utf-8");
        const json = JSON.parse(raw);

        const devices = json?.sites || {};

        const alertState = loadAlertState();
        const csvNewRows: any[] = [];

        // ✅ if CSV has no rows -> force initial save
        const existingCsvRows = readCsvRows();
        const shouldForceInitialSave = existingCsvRows.length === 0;

        for (const [systemIp, siteObj] of Object.entries<any>(devices)) {
            if (!siteObj) continue;

            const hostname = siteObj.hostname || "NA";
            const branchName = getBranchName(hostname);

            const tunnels = Array.isArray(siteObj.tunnels) ? siteObj.tunnels : [];

            // ✅ NEW: read siteState
            const siteState = String(siteObj.siteState || "").toLowerCase();

            /* ✅ NEW CONDITION 1: tunnels length == 0 AND siteState is DOWN */
            if (tunnels.length === 0 && siteState === "down") {
                const lastUpdated = Date.now();

                csvNewRows.push({
                    // "Last Updated": formatDateTime(lastUpdated),
                    Branch: branchName,
                    "System IP": systemIp,
                    Hostname: hostname,
                    Tunnel: "-",
                    State: "DOWN",
                    Type: "SITE_DOWN_NO_TUNNELS",
                });

                continue;
            }



            /* ✅ NEW CONDITION 2: all tunnels are DOWN */
            const allDown =
                tunnels.length > 0 &&
                tunnels.every((t: any) => String(t?.state || "").toLowerCase() === "down");

            if (allDown) {
                const lastUpdated =
                    Number(tunnels?.[0]?.lastUpdated) > 0 ? Number(tunnels?.[0]?.lastUpdated) : Date.now();

                csvNewRows.push({
                    "Last Updated": formatDateTime(lastUpdated),
                    Branch: branchName,
                    "System IP": systemIp,
                    Hostname: hostname,
                    Tunnel: "ALL_TUNNELS",
                    State: "DOWN",
                    Type: "ALL_DOWN",
                });
            }

            for (const t of tunnels) {
                const tunnelName = String(t?.tunnelName || "");
                if (!tunnelName) continue;

                const newState = String(t?.state || "").toLowerCase(); // up/down/partial
                if (!["up", "down", "partial"].includes(newState)) continue;

                // ✅ use lastUpdated (fallback allowed)
                const lastUpdated = Number(t?.lastUpdated) > 0 ? Number(t?.lastUpdated) : Date.now();

                const tunnelKey = `${systemIp}||${tunnelName}`;
                const prevState = String(alertState[tunnelKey] || "").toLowerCase();

                /* ✅ INITIAL SAVE (ONLY DOWN/PARTIAL) */
                if (!prevState || shouldForceInitialSave) {
                    if (newState === "down" || newState === "partial") {
                        csvNewRows.push({
                            "Last Updated": formatDateTime(lastUpdated),
                            Branch: branchName,
                            "System IP": systemIp,
                            Hostname: hostname,
                            Tunnel: replaceISPNames(tunnelName),
                            State: newState.toUpperCase(),
                            Type: "On Going",
                        });
                    }
                }

                /* ✅ STATE CHANGE EVENTS */
                if (prevState && prevState !== newState) {
                    // ✅ DOWN/PARTIAL -> UP
                    if (newState === "up") {
                        csvNewRows.push({
                            "Last Updated": formatDateTime(lastUpdated),
                            Branch: branchName,
                            "System IP": systemIp,
                            Hostname: hostname,
                            Tunnel: replaceISPNames(tunnelName),
                            State: "UP",
                            Type: "RECOVERED",
                        });
                    }

                    // ✅ UP -> DOWN/PARTIAL OR PARTIAL -> DOWN etc.
                    if (newState === "down" || newState === "partial") {
                        csvNewRows.push({
                            "Last Updated": formatDateTime(lastUpdated),
                            Branch: branchName,
                            "System IP": systemIp,
                            Hostname: hostname,
                            Tunnel: replaceISPNames(tunnelName),
                            State: newState.toUpperCase(),
                            Type: "CHANGED",
                        });
                    }
                }

                // ✅ update tunnel cache always
                alertState[tunnelKey] = newState;
            }
        }


        saveAlertState(alertState);

        const csvSummary = appendCsvRows(csvNewRows);

        return NextResponse.json({
            // ✅ FIXED: generatedAt now comes from API properly
            generatedAt: formatGeneratedAt(json?.generatedAtIST),
            debug: {
                csvFile: CSV_FILE,
                forcedInitialSave: shouldForceInitialSave,
                appendedNow: csvSummary.appended,
                totalCsvRows: csvSummary.total,
            },
        });
    } catch (err: any) {
        console.error("API ERROR:", err);
        return NextResponse.json({ error: "Failed", details: err.message }, { status: 500 });
    }
}
