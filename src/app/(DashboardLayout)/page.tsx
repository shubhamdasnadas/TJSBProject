"use client";

import React, { useEffect, useState } from "react";
import DashboardSummary from "./DashboardSummary";
import DashboardSummaryCount from "./DashboardSummaryCount";
import Problemseverity from "./Problemseverity";
import RangePickerDemo from "./RangePickerDemo";
import { Button } from "antd";
import axios from "axios";

const Dashboard = () => {
  const [rangeData, setRangeData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  const [groupID, setGroupID] = useState<number[]>([]);

  const user_token =
    typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : null;

  /* ============================
        FETCH ALL GROUP IDs
     ============================ */
  const fetchGAllGroupid = async () => {
    try {
      const res = await axios.post(
        "http://192.168.56.1:3000/api/api_host/api_host_group",
        {
          auth: user_token,
        }
      );

      // Extract ONLY groupid values (NOT objects)
      const ids = res.data.result.map((group: any) => Number(group.groupid));

      setGroupID(ids);
    } catch (err) {
      console.log("Error getting host groups");
    }
  };

  useEffect(() => {
    fetchGAllGroupid();
  }, []);

  console.log("Group IDs:", groupID);

  return (
    <div style={{ width: "100%" }}>
      {/* ⭐ RIGHT SIDE TOOLBAR */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          padding: "16px 24px",
        }}
      >
        <Button
          style={{
            background: "var(--button-bg)",
            color: "var(--button-text)",
            borderColor: "var(--button-border)",
          }}
          onClick={() => console.log("Current Range Data:", rangeData)}
        >
          Edit Dashboard
        </Button>

        <RangePickerDemo
          onRangeChange={(data) => {
            console.log("Range received:", data);
            setRangeData(data);
          }}
        />
      </div>

      {/* PASS CORRECT PROPS */}
      <DashboardSummaryCount rangeData={rangeData} groupID={groupID} />
      <DashboardSummary />
      <Problemseverity rangeData={rangeData} groupID={groupID} />
    </div>
  );
};

export default Dashboard;
