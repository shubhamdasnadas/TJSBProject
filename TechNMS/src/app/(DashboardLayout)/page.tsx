"use client";

import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import { Button, Form, Modal, Select } from "antd";
import axios from "axios";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import { WIDGET_TYPES } from "./widget/widgetRegistry";

/* ===================== LAZY LOAD WIDGETS ===================== */

const DashboardSummaryCount = lazy(() => import("./DashboardSummaryCount"));
const ProblemsTablePage = lazy(() => import("./ProblemsTable"));
const RangePickerDemo = lazy(() => import("./RangePickerDemo"));

const Graph = lazy(() => import("./widget/graph"));
const PieChart = lazy(() => import("./widget/pie_chart"));
const ItemValue = lazy(() => import("./widget/itemvalue"));
const ProblemSeverity = lazy(() => import("./Problemseverity"));
const ActionLog = lazy(() => import("./widget/actionLog"));
const TopHost = lazy(() => import("./widget/top_host/data"));

/* ================= STORAGE KEYS ================= */
const STORAGE_KEY = "dashboard_layout_v2";
const DYNAMIC_WIDGETS_KEY = "dashboard_dynamic_widgets_v1";
const REMOVED_STATIC_KEY = "dashboard_removed_static_v1";

/* ================= STATIC WIDGETS ================= */
const WIDGETS = [
  {
    id: "summary-count",
    title: "Summary Count",
    component: DashboardSummaryCount,
    x: 0,
    y: 0,
    w: 12,
    h: 2,
  },
  {
    id: "problems-table",
    title: "Active Problems",
    component: ProblemsTablePage,
    x: 6,
    y: 4,
    w: 6,
    h: 3,
  },
];

const getWidgetTitle = (type: string) => {
  if (type === "graph") return "Graph";
  if (type === "pie_chart") return "Pie Chart";
  if (type === "action_log") return "Action Log";
  if (type === "top_host") return "Top Host";
  if (type === "item_value") return "Item Value";
  if (type === "problems_by_severity") return "Problems by Severity";
  return "Widget";
};

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
  const [pieConfig, setPieConfig] = useState<any>(null);
  const [itemConfig, setItemConfig] = useState<any>(null);
  const [tophostConfig, setTophostConfig] = useState<any>(null);
  const [problemSeverityConfig, setProblemSeverityConfig] = useState<any>(null);

  const [editingTopHostConfig, setEditingTopHostConfig] =
    useState<any>(null);

  const [rangeData, setRangeData] = useState({
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
  });

  const [groupID, setGroupID] = useState<number[]>([]);

  const user_token =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_auth")
      : null;

  /* ================= REMOVE HELPERS ================= */

  const removeWidgetFromLocalStorage = (widgetId: string) => {
    const dynRaw = localStorage.getItem(DYNAMIC_WIDGETS_KEY);
    if (dynRaw) {
      const dyn = JSON.parse(dynRaw).filter((w: any) => w.id !== widgetId);
      localStorage.setItem(DYNAMIC_WIDGETS_KEY, JSON.stringify(dyn));
    }

    const layoutRaw = localStorage.getItem(STORAGE_KEY);
    if (layoutRaw) {
      const layout = JSON.parse(layoutRaw).filter(
        (l: any) => l.id !== widgetId
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    }
  };

  /* ================= LOAD FROM STORAGE ================= */

  useEffect(() => {
    const dyn = localStorage.getItem(DYNAMIC_WIDGETS_KEY);
    const removed = localStorage.getItem(REMOVED_STATIC_KEY);

    if (dyn) setDynamicWidgets(JSON.parse(dyn));
    if (removed) setRemovedStaticIds(JSON.parse(removed));

    hasLoadedFromStorage.current = true;
  }, []);

  /* ================= SAVE DYNAMIC WIDGETS ================= */

  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    if (!hasUserModifiedWidgets.current) return;

    localStorage.setItem(
      DYNAMIC_WIDGETS_KEY,
      JSON.stringify(dynamicWidgets)
    );
  }, [dynamicWidgets]);

  /* ================= SAVE REMOVED STATIC ================= */

  useEffect(() => {
    localStorage.setItem(
      REMOVED_STATIC_KEY,
      JSON.stringify(removedStaticIds)
    );
  }, [removedStaticIds]);

  /* ================= FETCH HOST GROUPS ================= */

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
        staticGrid: false,
        draggable: { handle: ".dashboard-card-header" },
        resizable: { handles: "all" },
      },
      gridRef.current
    );

    setGridReady(true);
  }, []);

  /* ================= RESTORE GRID ================= */

  useEffect(() => {
    if (!grid.current || !gridReady) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    let layout = raw ? JSON.parse(raw) : [];

    const ids = new Set(layout.map((l: any) => l.id));
    WIDGETS.forEach((w) => {
      if (!ids.has(w.id)) {
        layout.push({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h });
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));

    requestAnimationFrame(() => {
      grid.current!.load(layout);
      window.dispatchEvent(new Event("resize"));
    });
  }, [gridReady]);

  /* ================= REGISTER DYNAMIC ================= */

  useEffect(() => {
    if (!grid.current) return;

    dynamicWidgets.forEach((w) => {
      const el = document.querySelector(
        `[gs-id="${w.id}"]`
      ) as HTMLElement | null;
      if (el) grid.current!.makeWidget(el);
    });

    window.dispatchEvent(new Event("resize"));
  }, [dynamicWidgets]);

  /* ================= EDIT MODE ================= */

  useEffect(() => {
    if (!grid.current) return;
    grid.current.setStatic(!editMode);
  }, [editMode]);

  /* ================= ADD WIDGET ================= */

  const handleAddWidget = () => {
    if (!selectType) return;

    hasUserModifiedWidgets.current = true;
    const id = `${selectType}-${Date.now()}`;

    setDynamicWidgets((prev) => {
      const next = [
        ...prev,
        {
          id,
          type: selectType,
          config:
            selectType === "pie_chart"
              ? pieConfig
              : selectType === "item_value"
              ? itemConfig
              : selectType === "problems_by_severity"
              ? problemSeverityConfig
              : selectType === "top_host"
              ? tophostConfig
              : graphConfig,
        },
      ];

      localStorage.setItem(DYNAMIC_WIDGETS_KEY, JSON.stringify(next));
      return next;
    });

    setShowAddModal(false);
    setSelectType("");
    setGraphConfig(null);
    setPieConfig(null);
    setItemConfig(null);
    setTophostConfig(null);
    setProblemSeverityConfig(null);
    setEditingTopHostConfig(null);
  };

  /* ================= REMOVE ================= */

  const removeWidget = (id: string) => {
    hasUserModifiedWidgets.current = true;

    const dynamicWidgets: any[] = JSON.parse(
      localStorage.getItem(DYNAMIC_WIDGETS_KEY) || "[]"
    );

    const isDynamic = dynamicWidgets.some((w) => w.id === id);

    if (isDynamic) {
      setDynamicWidgets((prev) => prev.filter((w) => w.id !== id));
    }

    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[gs-id="${id}"]`
      ) as HTMLElement | null;

      if (el && grid.current) {
        grid.current.removeWidget(el, false);
      }

      grid.current?.compact();
    });

    removeWidgetFromLocalStorage(id);
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
      {/* TOOLBAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          padding: 16,
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

        <Suspense fallback={<span>Loading date range…</span>}>
          <RangePickerDemo onRangeChange={setRangeData} />
        </Suspense>
      </div>

      {/* GRID */}
      <div className="grid-stack" ref={gridRef}>
        {WIDGETS.filter((w) => !removedStaticIds.includes(w.id)).map(
          ({ id, title, component: Component, x, y, w, h }) => (
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
                <div className="dashboard-card-header">
                  {title}
                  {editMode && (
                    <span
                      onClick={() => removeWidget(id)}
                      style={{
                        float: "right",
                        color: "red",
                        cursor: "pointer",
                      }}
                    >
                      ✖
                    </span>
                  )}
                </div>

                <div className="dashboard-card-body">
                  <Suspense fallback={<div>Loading...</div>}>
                    <Component rangeData={rangeData} groupID={groupID} />
                  </Suspense>
                </div>
              </div>
            </div>
          )
        )}

        {/* DYNAMIC */}
        {dynamicWidgets.map((w) => (
          <div
            key={w.id}
            className="grid-stack-item"
            gs-id={w.id}
            gs-w="6"
            gs-h="4"
          >
            <div className="grid-stack-item-content dashboard-card">
              <div className="dashboard-card-header">
                {getWidgetTitle(w.type)}

                {editMode && (
                  <span
                    onClick={() => removeWidget(w.id)}
                    style={{ float: "right", color: "red", cursor: "pointer" }}
                  >
                    ✖
                  </span>
                )}
              </div>

              <div className="dashboard-card-body">
                <Suspense fallback={<div>Loading widget…</div>}>
                  {w.type === "graph" && (
                    <Graph rangeData={rangeData} initialConfig={w.config} />
                  )}

                  {w.type === "top_host" && (
                    <TopHost mode="preview" initialConfig={w.config} />
                  )}

                  {w.type === "pie_chart" && (
                    <PieChart initialConfig={w.config} />
                  )}

                  {w.type === "item_value" && (
                    <ItemValue initialConfig={w.config} />
                  )}

                  {w.type === "problems_by_severity" && (
                    <ProblemSeverity
                      rangeData={rangeData}
                      groupID={groupID}
                      initialConfig={w.config}
                    />
                  )}

                  {w.type === "action_log" && <ActionLog />}
                </Suspense>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD MODAL */}
      <Modal
        title="Add Widget"
        open={showAddModal}
        width={1000}
        centered
        onCancel={() => {
          setShowAddModal(false);
          setSelectType("");
          setEditingTopHostConfig(null);
        }}
        onOk={handleAddWidget}
      >
        <Form layout="vertical">
          <Form.Item label="Type">
            <Select
              onChange={setSelectType}
              style={{ width: "70%" }}
              value={selectType}
            >
              {WIDGET_TYPES.map((v: any) => (
                <Select.Option key={v.value} value={v.value}>
                  {v.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Suspense fallback={<div>Loading…</div>}>
            {selectType === "graph" && (
              <Graph rangeData={rangeData} onConfigChange={setGraphConfig} />
            )}

            {selectType === "top_host" && (
              <TopHost
                mode="widget"
                initialConfig={editingTopHostConfig}
                onConfigChange={setTophostConfig}
              />
            )}

            {selectType === "pie_chart" && (
              <PieChart onConfigChange={setPieConfig} />
            )}

            {selectType === "item_value" && (
              <ItemValue onConfigChange={setItemConfig} />
            )}

            {selectType === "problems_by_severity" && (
              <ProblemSeverity
                rangeData={rangeData}
                groupID={groupID}
                onConfigChange={setProblemSeverityConfig}
              />
            )}

            {selectType === "action_log" && <ActionLog />}
          </Suspense>
        </Form>
      </Modal>
    </div>
  );
}
