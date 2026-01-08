import { Server } from "socket.io";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

let io: Server | null = null;

const DATA_FILE = path.join(process.cwd(), "dashboard-state.json");

/* ---------- helpers ---------- */
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {
      layout: [],
      dynamicWidgets: [],
      removedStatic: [],
    };
  }
}

function saveState(state: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

/* ---------- load once ---------- */
let DASHBOARD_STATE = loadState();

export async function GET(req: NextRequest) {
  if (!io) {
    io = new Server({
      path: "/api/socket_io",
      cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
      // ✅ Always send last saved state
      socket.emit("dashboard:sync", DASHBOARD_STATE);

      socket.on("dashboard:save", (state) => {
        DASHBOARD_STATE = state;
        saveState(DASHBOARD_STATE);

        // ✅ Broadcast to ALL browsers
        io?.emit("dashboard:sync", DASHBOARD_STATE);
      });
    });
  }

  return new Response("Socket.IO running");
}

export const dynamic = "force-dynamic";
