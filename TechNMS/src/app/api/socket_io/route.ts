import { NextRequest } from "next/server";
import { Server } from "socket.io";

let io: any;

// in-memory dashboard shared by all users
let DASHBOARD_STATE = {
  layout: [] as any[],
  dynamicWidgets: [] as any[],
  removedStatic: [] as any[],
};

export async function GET(req: NextRequest) {
  // Only create server once
  // @ts-ignore
  if (!io) {
    // @ts-ignore
    io = new Server({
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: { origin: "*" },
    });

    io.on("connection", (socket: any) => {
      console.log("client connected:", socket.id);

      // Send current dashboard to new user
      socket.emit("dashboard:sync", DASHBOARD_STATE);

      // Save whole dashboard
      socket.on("dashboard:save", (payload: any) => {
        DASHBOARD_STATE = payload;
        io.emit("dashboard:sync", DASHBOARD_STATE);
      });

      // Add widget
      socket.on("widget:add", (widget: any) => {
        DASHBOARD_STATE.dynamicWidgets.push(widget);
        io.emit("dashboard:sync", DASHBOARD_STATE);
      });

      // Remove widget
      socket.on("widget:remove", (id: string) => {
        DASHBOARD_STATE.dynamicWidgets =
          DASHBOARD_STATE.dynamicWidgets.filter((w) => w.id !== id);

        DASHBOARD_STATE.layout = DASHBOARD_STATE.layout.filter(
          (l) => l.id !== id
        );

        io.emit("dashboard:sync", DASHBOARD_STATE);
      });

      // Layout update (drag / resize)
      socket.on("layout:update", (layout: any[]) => {
        DASHBOARD_STATE.layout = layout;
        io.emit("dashboard:sync", DASHBOARD_STATE);
      });

      socket.on("disconnect", () =>
        console.log("client disconnected:", socket.id)
      );
    });
  }

  return new Response("Socket server running");
}

// Disable caching
export const dynamic = "force-dynamic";
