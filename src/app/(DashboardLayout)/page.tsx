"use client";

import React, { useState } from "react";
import DashboardSummary from "./DashboardSummary";
import DashboardSummaryCount from "./DashboardSummaryCount";
import Problemseverity from "./Problemseverity";
import RangePickerDemo from "./RangePickerDemo";

const Dashboard = () => {
  const [rangeData, setRangeData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  console.log("Range Data in Dashboard:", rangeData);

  return (
    <div>
      {/* Only RangePickerDemo sends data to Dashboard */}
      <RangePickerDemo
        onRangeChange={(data) => {
          console.log("Received in Dashboard:", data);
          setRangeData(data);
        }}
      />

      {/* NO DATA PASSED to these components */}
      <DashboardSummaryCount rangeData={rangeData}/>
      <DashboardSummary />
      <Problemseverity />
    </div>
  );
};

export default Dashboard;
