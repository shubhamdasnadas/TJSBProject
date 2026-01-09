import axios from "axios";

export type IpRow = {
  hostname: string;
  systemIp: string;
  branchName: string;
  tunnels: any[];
  rowState: "up" | "down" | "partial";
};

const getBranchNameByHostname = (hostname: string) => {
  // ⛔ keep your existing logic here
  return hostname || "NA";
};

export async function loadTunnels(): Promise<IpRow[]> {
  const res = await axios.post("/api/sdwan/tunnels");

  const devices = res.data.devices || {};

  const final: IpRow[] = Object.entries(devices).map(
    ([systemIp, tunnels]: any) => {
      const first = tunnels[0];
      const hostname = first?.hostname || "NA";
      const branchName = getBranchNameByHostname(hostname);

      const sortedTunnels = tunnels.sort((a: any, b: any) => {
        const priority = (v: string) =>
          v === "down" ? 0 : v === "up" ? 1 : 2;

        return priority(a.state) - priority(b.state);
      });

      const allUp = sortedTunnels.every((t: any) => t.state === "up");
      const allDown = sortedTunnels.every((t: any) => t.state === "down");

      let rowState: "up" | "down" | "partial" = "partial";
      if (allUp) rowState = "up";
      if (allDown) rowState = "down";

      return {
        hostname,
        systemIp,
        branchName,
        tunnels: sortedTunnels,
        rowState,
      };
    }
  );

  return final;
}
