"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

/* ================= TYPES ================= */

export interface HostGroup {
  groupid: string;
  name: string;
}

export interface Host {
  hostid: string;
  name: string;
}

export interface Item {
  itemid: string;
  name: string;
  key_: string;
}

/* ================= MAIN HOOK ================= */

export default function useZabbixData() {
  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  const [hostGroups, setHostGroups] = useState<HostGroup[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  /**
   * PROMISE CACHE (can be undefined)
   */
  const requestCache = useRef<Record<string, Promise<any> | undefined>>({});

  const fetchZabbixData = useCallback(
    async (type: "hostgroup" | "host" | "item", ids: string[] = []) => {
      if (!user_token) return;

      const cacheKey = `${type}:${ids.join(",")}`;

      // 🔥 already loading / loaded → reuse
      const existing = requestCache.current[cacheKey];
      if (existing) return existing;

      const promise = (async () => {
        try {
          let url = "";
          let payload: any = { auth: user_token };

          switch (type) {
            case "hostgroup":
              url = "/api/api_host/api_host_group";
              break;

            case "host":
              if (!ids.length) return [];
              url = "/api/api_host/api_get_host";
              payload.groupids = ids;
              break;

            case "item":
              if (!ids.length) return [];
              url = "/api/dashboard_action_log/get_item";
              payload.hostids = ids;
              break;
          }

          const res = await axios.post(url, payload);
          const result = res.data?.result ?? [];

          if (type === "hostgroup") setHostGroups(result);
          if (type === "host") setHosts(result);
          if (type === "item") setItems(result);

          return result;
        } catch (err) {
          console.error(`Failed to fetch ${type}`, err);
          return [];
        } finally {
          // clear after use
          delete requestCache.current[cacheKey];
        }
      })();

      requestCache.current[cacheKey] = promise;
      return promise;
    },
    [user_token]
  );

  useEffect(() => {
    fetchZabbixData("hostgroup");
  }, [fetchZabbixData]);

  return {
    hostGroups,
    hosts,
    items,
    fetchZabbixData,
  };
}
