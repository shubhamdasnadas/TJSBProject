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
import ActionLog from "./widget/actionLog";
import Graph from "./widget/graph";

/* ================= STORAGE KEYS ================= */
const STORAGE_KEY = "dashboard_layout_v2";
const DYNAMIC_WIDGETS_KEY = "dashboard_dynamic_widgets_v1";
const REMOVED_STATIC_KEY = "dashboard_removed_static_v1";

/* ================= STATIC WIDGETS ================= */
const WIDGETS = [
  { id: "summary-count", title: "Summary Count", component: DashboardSummaryCount, x: 0, y: 0, w: 12, h: 2 },
  { id: "summary", title: "Summary", component: DashboardSummary, x: 0, y: 2, w: 12, h: 2 },
  { id: "problem-severity", title: "Problem Severity", component: Problemseverity, x: 0, y: 4, w: 6, h: 3 },
  { id: "problems-table", title: "Active Problems", component: ProblemsTablePage, x: 6, y: 4, w: 6, h: 3 },
];

export default function Dashboard() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const grid = useRef<GridStack | null>(null);

  const hasLoadedFromStorage = useRef(false);
  const hasUserModifiedWidgets = useRef(false);

  const [gridReady, setGridReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectType, setSelectType] = useState("");

  const [dynamicWidgets, setDynamicWidgets] = useState<any[]>([]);
  const [removedStaticIds, setRemovedStaticIds] = useState<string[]>([]);
  const [graphConfig, setGraphConfig] = useState<any>(null);

  const [groupID, setGroupID] = useState<number[]>([]);
  const [rangeData, setRangeData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  /* ================= LOAD SAVED STATE ================= */
  useEffect(() => {
    const dyn = localStorage.getItem(DYNAMIC_WIDGETS_KEY);
    const removed = localStorage.getItem(REMOVED_STATIC_KEY);

    if (dyn) setDynamicWidgets(JSON.parse(dyn));
    if (removed) setRemovedStaticIds(JSON.parse(removed));

    hasLoadedFromStorage.current = true;
  }, []);

  /* ================= PERSIST DYNAMIC WIDGETS ================= */
  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    if (!hasUserModifiedWidgets.current) return;
    if (dynamicWidgets.length === 0) return;

    localStorage.setItem(
      DYNAMIC_WIDGETS_KEY,
      JSON.stringify(dynamicWidgets)
    );
  }, [dynamicWidgets]);

  /* ================= PERSIST REMOVED STATIC ================= */
  useEffect(() => {
    localStorage.setItem(
      REMOVED_STATIC_KEY,
      JSON.stringify(removedStaticIds)
    );
  }, [removedStaticIds]);

  /* ================= FETCH GROUP IDS ================= */
  useEffect(() => {
    if (!user_token) return;

    axios
      .post("/api/api_host/api_host_group", { auth: user_token })
      .then((res) =>
        setGroupID(res.data.result.map((g: any) => Number(g.groupid)))
      )
      .catch(() => {});
  }, [user_token]);

  /* ================= GRID INIT ================= */
  useEffect(() => {
    if (!gridRef.current || grid.current) return;

    grid.current = GridStack.init(
      {
        column: 12,
        cellHeight: 90,
        margin: 12,
        staticGrid: true,
        draggable: { handle: ".dashboard-card-header" },
        resizable: { handles: "all" },
      },
      gridRef.current
    );

    setGridReady(true);
  }, []);

  /* ================= LOAD GRID LAYOUT ================= */
  useEffect(() => {
    if (!grid.current || !gridReady) return;

    const savedLayout = localStorage.getItem(STORAGE_KEY);
    if (!savedLayout) return;

    requestAnimationFrame(() => {
      grid.current?.load(JSON.parse(savedLayout));
      setTimeout(() => window.dispatchEvent(new Event("resize")), 0);
    });
  }, [gridReady, dynamicWidgets, removedStaticIds]);

  /* ================= REGISTER DYNAMIC WIDGETS ================= */
  useEffect(() => {
    if (!grid.current) return;

    dynamicWidgets.forEach((w) => {
      const el = document.querySelector(`[gs-id="${w.id}"]`) as HTMLElement | null;
      if (el) {
        grid.current?.makeWidget(el);
        window.dispatchEvent(new Event("resize"));
      }
    });
  }, [dynamicWidgets]);

  /* ================= EDIT MODE ================= */
  useEffect(() => {
    if (!grid.current) return;

    grid.current.setStatic(!editMode);
    grid.current.enableMove(editMode);
    grid.current.enableResize(editMode);
  }, [editMode]);

  /* ================= ADD WIDGET ================= */
  const handleAddWidget = () => {
    if (!selectType) return;

    hasUserModifiedWidgets.current = true;

    const id = `${selectType}-${Date.now()}`;

    setDynamicWidgets((prev) => [
      ...prev,
      { id, type: selectType, config: graphConfig },
    ]);

    setShowAddModal(false);
    setGraphConfig(null);
  };

  /* ================= REMOVE HELPERS ================= */
  const removeWidgetFromLocalStorage = (widgetId: string) => {
    const dynRaw = localStorage.getItem(DYNAMIC_WIDGETS_KEY);
    if (dynRaw) {
      const dyn = JSON.parse(dynRaw).filter((w: any) => w.id !== widgetId);
      localStorage.setItem(DYNAMIC_WIDGETS_KEY, JSON.stringify(dyn));
    }

    const layoutRaw = localStorage.getItem(STORAGE_KEY);
    if (layoutRaw) {
      const layout = JSON.parse(layoutRaw).filter((i: any) => i.id !== widgetId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }
  };

  /* ================= REMOVE HANDLERS ================= */
  const removeDynamicWidget = (id: string) => {
    hasUserModifiedWidgets.current = true;

    setDynamicWidgets((prev) => prev.filter((w) => w.id !== id));

    const el = document.querySelector(`[gs-id="${id}"]`) as HTMLElement;
    if (el) grid.current?.removeWidget(el);

    removeWidgetFromLocalStorage(id);
  };

  const removeStaticWidget = (id: string) => {
    setRemovedStaticIds((prev) => [...prev, id]);

    const el = document.querySelector(`[gs-id="${id}"]`) as HTMLElement;
    if (el) grid.current?.removeWidget(el);
  };

  /* ================= SAVE LAYOUT ================= */
  const saveLayout = () => {
    if (!grid.current) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(grid.current.save(false))
    );
    setEditMode(false);
  };

  return (
    <div style={{ width: "100%" }}>
      {/* ================= TOOLBAR ================= */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 24px" }}>
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

      {/* ================= GRID ================= */}
      <div className="grid-stack" ref={gridRef}>
        {WIDGETS.filter((w) => !removedStaticIds.includes(w.id)).map(
          ({ id, title, component: Component, x, y, w, h }) => (
            <div key={id} className="grid-stack-item" gs-id={id} gs-x={x} gs-y={y} gs-w={w} gs-h={h}>
              <div className="grid-stack-item-content dashboard-card">
                <div className="dashboard-card-header">
                  {title}
                  {editMode && (
                    <span onClick={() => removeStaticWidget(id)} style={{ float: "right", cursor: "pointer", color: "red" }}>
                      ✖
                    </span>
                  )}
                </div>
                <div className="dashboard-card-body">
                  <Component rangeData={rangeData} groupID={groupID} />
                </div>
              </div>
            </div>
          )
        )}

        {dynamicWidgets.map((w) => (
          <div key={w.id} className="grid-stack-item" gs-id={w.id} gs-w="6" gs-h="4">
            <div className="grid-stack-item-content dashboard-card">
              <div className="dashboard-card-header">
                {w.type === "graph" ? "Graph" : "Action Log"}
                {editMode && (
                  <span onClick={() => removeDynamicWidget(w.id)} style={{ float: "right", cursor: "pointer", color: "red" }}>
                    ✖
                  </span>
                )}
              </div>
              <div className="dashboard-card-body">
                {w.type === "graph" && <Graph rangeData={rangeData} initialConfig={w.config} />}
                {w.type === "action_log" && <ActionLog />}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================= ADD MODAL ================= */}
      <Modal
        title="Add Widget"
        open={showAddModal}
        width={1000}
        centered
        destroyOnHidden
        onCancel={() => setShowAddModal(false)}
        onOk={handleAddWidget}
      >
        <Form layout="vertical">
          <Form.Item label="Type">
            <Select style={{ width: "70%" }} onChange={setSelectType}>
              {WIDGET_TYPES.map((v: any) => (
                <Select.Option key={v.value} value={v.value}>
                  {v.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectType === "action_log" && <ActionLog />}
          {selectType === "graph" && <Graph rangeData={rangeData} onConfigChange={setGraphConfig} />}
        </Form>
      </Modal>
    </div>
  );
}
