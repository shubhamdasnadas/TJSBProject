"use client";

import axios from "axios";
import { useEffect, useState } from "react";

export default function TunnelsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await axios.post("/api/sdwan/tunnels");
      const json = res;
      console.log(json)
      setData(json.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>Loading tunnels…</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">SD-WAN Tunnel Status</h1>

      <table border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>System IP</th>
            <th>Remote IP</th>
            <th>Color</th>
            <th>State</th>
            <th>Site ID</th>
          </tr>
        </thead>

        {/* <tbody>
          {data.map((t: any, i) => (
            <tr key={i}>
              <td>{t["system-ip"]}</td>
              <td>{t["remote-system-ip"]}</td>
              <td>{t.color}</td>
              <td>{t.state}</td>
              <td>{t["site-id"]}</td>
            </tr>
          ))}
        </tbody> */}
      </table>
    </div>
  );
}
