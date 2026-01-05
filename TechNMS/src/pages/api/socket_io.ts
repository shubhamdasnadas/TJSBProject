import type { NextApiRequest, NextApiResponse } from "next";
import { Server } from "socket.io";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(res.socket as any).server.io) {
    const io = new Server((res.socket as any).server, {
      path: "/api/socket_io",
    });

    (res.socket as any).server.io = io;

    io.on("connection", (socket) => {
      socket.on("dashboard:update", (layout) => {
        socket.broadcast.emit("dashboard:sync", layout);
      });
    });
  }

  res.end();
}
