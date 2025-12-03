"use client";

import React from "react";
import Sidebar from "../components/Sidebar";

export default function MonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 bg-white p-6">
        <h1 className="text-3xl font-semibold mb-6">Monitoring</h1>
        {children}
      </div>
    </div>
  );
}
