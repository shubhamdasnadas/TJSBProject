"use client";

import { useEffect, useState } from "react";
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

  /* ================= SINGLE REUSABLE FUNCTION ================= */

  const fetchZabbixData = async (
    type: "hostgroup" | "host" | "item",
    ids: string[] = []
  ) => {
    if (!user_token) return;

    try {
      let url = "";
      let payload: any = { auth: user_token };

      switch (type) {
        case "hostgroup":
          url = "/api/api_host/api_host_group";
          break;

        case "host":
          if (!ids.length) return;
          url = "/api/api_host/api_get_host";
          payload.groupids = ids;
          break;

        case "item":
          if (!ids.length) return;
          url = "/api/dashboard_action_log/get_item";
          payload.hostids = ids;
          break;
      }

      const res = await axios.post(url, payload);

      if (type === "hostgroup") setHostGroups(res.data?.result ?? []);
      if (type === "host") setHosts(res.data?.result ?? []);
      if (type === "item") setItems(res.data?.result ?? []);
    } catch (err) {
      console.error(`Failed to fetch ${type}`, err);
    }
  };

  /* ================= AUTO LOAD HOST GROUPS ================= */

  useEffect(() => {
    fetchZabbixData("hostgroup");
  }, []);

  return {
    hostGroups,
    hosts,
    items,
    fetchZabbixData,
  };
}
