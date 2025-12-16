"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Modal, Select } from "antd";
import axios from "axios";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import { WIDGET_TYPES } from "./widget/widgetRegistry";
import DashboardSummary from "./DashboardSummary";
import DashboardSummaryCount from "./DashboardSummaryCount";
import Problemseverity from "./Problemseverity";
import ProblemsTablePage from "./ProblemsTable";
import RangePickerDemo from "./RangePickerDemo";
import { ok } from "assert";
import ActionLog from "./widget/actionLog";
import Graph from "./widget/graph";

/* ================= STORAGE KEY ================= */
const STORAGE_KEY = "dashboard_layout_v2";

/* ================= WIDGET CONFIG ================= */
const WIDGETS = [
  {
    id: "summary-count",
    title: "Summary Count",
    component: DashboardSummaryCount,
    x: 0,
    y: 0,
    w: 12,
    h: 2,
    needsProps: true,
  },
  {
    id: "summary",
    title: "Summary",
    component: DashboardSummary,
    x: 0,
    y: 2,
    w: 12,
    h: 2,
    needsProps: false,
  },
  {
    id: "problem-severity",
    title: "Problem Severity",
    component: Problemseverity,
    x: 0,
    y: 4,
    w: 6,
    h: 3,
    needsProps: true,
  },
  {
    id: "problems-table",
    title: "Active Problems",
    component: ProblemsTablePage,
    x: 6,
    y: 4,
    w: 6,
    h: 3,
    needsProps: false,
  },
];
export default function Dashboard() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const grid = useRef<GridStack | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [groupID, setGroupID] = useState<number[]>([]);
  const [rangeData, setRangeData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });
  const [selectType, setSelectType] = useState<string>("");
  const user_token = typeof window !== "undefined" ? localStorage.getItem("zabbix_auth") : null;

  /* ================= FETCH GROUP IDS ================= */
  useEffect(() => {
    if (!user_token) return;
    axios.post("/api/api_host/api_host_group", {
      auth: user_token,
    })
      .then((res) =>
        setGroupID(res.data.result.map((g: any) => Number(g.groupid)))
      )
      .catch(() => console.log("Error getting host groups"));
  }, [user_token]);

  /* ================= GRID INIT ================= */
  useEffect(() => {
    if (!gridRef.current || grid.current) return;

    grid.current = GridStack.init(
      {
        column: 12,
        cellHeight: 90,
        margin: 12,
        float: false,
        staticGrid: true,
        draggable: { handle: ".dashboard-card-header" },
        resizable: { handles: "all" },
        alwaysShowResizeHandle: true,
      },
      gridRef.current
    );
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      grid.current.load(JSON.parse(saved));
    }
  }, []);

  /* ================= EDIT MODE ================= */
  useEffect(() => {
    if (!grid.current) return;
    if (editMode) {
      grid.current.setStatic(false);
      grid.current.enableMove(true);
      grid.current.enableResize(true);
    } else {
      grid.current.enableMove(false);
      grid.current.enableResize(false);
      grid.current.setStatic(true);
    }
    gridRef.current?.classList.toggle("dashboard-edit-mode", editMode);
  }, [editMode]);

  /* ================= SAVE LAYOUT ================= */
  const saveLayout = () => {
    if (!grid.current) return;

    const layout = grid.current.save(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    setEditMode(false);
  };
  return (
    <div style={{ width: "100%" }}>
      {/* ================= TOOLBAR ================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          padding: "16px 24px",
        }}
      >
        <Button onClick={() => (editMode ? saveLayout() : setEditMode(true))}>
          {editMode ? "Save Dashboard" : "Edit Dashboard"}
        </Button>

        {editMode && (
          <Button type="dashed" onClick={() => setShowAddModal(true)}>
            Add
          </Button>
        )}

        <RangePickerDemo onRangeChange={setRangeData} />
      </div>
      {/* ================ GRID ================= */}
      <div className="grid-stack" ref={gridRef}>
        {WIDGETS.map(
          ({ id, title, component: Component, x, y, w, h, needsProps }) => (
            <div
              key={id}
              className="grid-stack-item"
              gs-id={id}
              gs-x={x}
              gs-y={y}
              gs-w={w}
              gs-h={h}
            >
              <div className="grid-stack-item-content dashboard-card">
                <div className="dashboard-card-header">{title}</div>
                <div className="dashboard-card-body">
                  {needsProps ? (
                    <Component rangeData={rangeData} groupID={groupID} />
                  ) : (
                    <Component rangeData={rangeData} groupID={groupID} />
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* ================= EMPTY ADD MODAL ================= */}
      <Modal
        title="Add Widget"
        open={showAddModal}
        width={1000}          
        centered
        destroyOnClose
        onCancel={() => setShowAddModal(false)}
        onOk={() => {
          console.log("ok");
          setShowAddModal(false);
        }}
      >
        <Form layout="vertical">
          <Form.Item label="Type">
            <Select
              style={{ width: "70%" }}
              placeholder="Select a type"
              onChange={(value) => setSelectType(value)}
            >
              {WIDGET_TYPES.map((val: any) => (
                <Select.Option key={val.value} value={val.value}>
                  {val.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectType === "action_log" && (
            <div style={{ marginTop: 16 }}>
              <ActionLog />
            </div>
          )}{
            selectType === "graph" && (
              <div>
                <Graph />
              </div>
            )
          }
        </Form>
      </Modal>

    </div>
  );
}
