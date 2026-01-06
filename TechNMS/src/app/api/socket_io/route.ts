import { NextRequest } from "next/server";
import { Server as IOServer } from "socket.io";

let io: any = null;

// In-memory dashboard (NO DB)
let DASHBOARD_STATE = {
  layout: [] as any[],
  dynamicWidgets: [] as any[],
  removedStatic: [] as any[],
};

export async function GET(req: NextRequest) {
  // @ts-ignore
  if (!io) {
    // @ts-ignore
    io = new IOServer({
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: { origin: "*" },
    });

    io.on("connection", (socket: any) => {
      console.log("client connected:", socket.id);

      // send initial dashboard
      socket.emit("dashboard:sync", DASHBOARD_STATE);

      // save full dashboard
      socket.on("dashboard:save", (payload: any) => {
        DASHBOARD_STATE = payload;
        io.emit("dashboard:sync", DASHBOARD_STATE);
      });

      // add widget
      socket.on("widget:add", (widget: any) => {
        DASHBOARD_STATE.dynamicWidgets.push(widget);
        io.emit("dashboard:sync", DASHBOARD_STATE);
      });

      // remove widget
      socket.on("widget:remove", (id: string) => {
        DASHBOARD_STATE.dynamicWidgets =
          DASHBOARD_STATE.dynamicWidgets.filter((w) => w.id !== id);

        DASHBOARD_STATE.layout = DASHBOARD_STATE.layout.filter(
          (l) => l.id !== id
        );

        io.emit("dashboard:sync", DASHBOARD_STATE);
      });

      // layout update (drag / resize)
      socket.on("layout:update", (layout: any[]) => {
        DASHBOARD_STATE.layout = layout;
        io.emit("dashboard:sync", DASHBOARD_STATE);
      });

      socket.on("disconnect", () =>
        console.log("client disconnected:", socket.id)
      );
    });
  }

  return new Response("Socket Server Running");
}

export const dynamic = "force-dynamic";
