import axios from "axios";


export type IpRow = {
  hostname: string;
  systemIp: string;
  branchName: string;
  tunnels: any[];
  rowState: "up" | "down" | "partial";
};

export async function loadTunnels(): Promise<IpRow[]> {
  const res = await axios.post("/api/sdwan/tunnels");
  const devices = res.data.devices || {};

  const rows: IpRow[] = Object.entries(devices).map(
    ([systemIp, tunnels]: any) => {
      const first = tunnels[0];
      const hostname = first?.hostname || "NA";

      const sortedTunnels = tunnels.sort((a: any, b: any) => {
        const p = (v: string) =>
          v === "down" ? 0 : v === "partial" ? 1 : 2;
        return p(a.state) - p(b.state);
      });

      const allUp = sortedTunnels.every((t: any) => t.state === "up");
      const allDown = sortedTunnels.every((t: any) => t.state === "down");

      let rowState: "up" | "down" | "partial" = "partial";
      if (allUp) rowState = "up";
      if (allDown) rowState = "down";

      return {
        hostname,
        systemIp,
        branchName: hostname,
        tunnels: sortedTunnels,
        rowState,
      };
    }
  );

  // 🔥 FINAL SORT: down → partial → up
  return rows.sort((a, b) => {
    const order = { down: 0, partial: 1, up: 2 };
    return order[a.rowState] - order[b.rowState];
  });
}
