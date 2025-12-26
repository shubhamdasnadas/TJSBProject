"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Modal, Select } from "antd";
import axios from "axios";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
// import { EncryptedText } from "@/components/ui/encrypted-text";
import { WIDGET_TYPES } from "./widget/widgetRegistry";
import DashboardSummary from "./DashboardSummary";
import DashboardSummaryCount from "./DashboardSummaryCount";
import Problemseverity from "./Problemseverity";
import ProblemsTablePage from "./ProblemsTable";
import RangePickerDemo from "./RangePickerDemo";
import ActionLog from "./widget/actionLog";
import Graph from "./widget/graph";
import PieChart from "./widget/pie_chart";
import ItemValue from "./widget/itemvalue";
import ProblemSeverity from "./Problemseverity";
import { group } from "console";
import ProblemTableDay from "./ProblemTableDay";
import TopHost from "./widget/top_host/data";

/* ================= STORAGE KEYS ================= */
const STORAGE_KEY = "dashboard_layout_v2";
const DYNAMIC_WIDGETS_KEY = "dashboard_dynamic_widgets_v1";
const REMOVED_STATIC_KEY = "dashboard_removed_static_v1";

/* ================= STATIC WIDGETS ================= */
const WIDGETS = [
  { id: "summary-count", title: "Summary Count", component: DashboardSummaryCount, x: 0, y: 0, w: 12, h: 2 },
  // { id: "problem-table-day", title: "Problem Day Table", component: ProblemTableDay, x: 0, y: 2, w: 12, h: 2 },
  // { id: "problem-severity", title: "Problem Severity", component: Problemseverity, x: 0, y: 4, w: 6, h: 3 },
  { id: "problems-table", title: "Active Problems", component: ProblemsTablePage, x: 6, y: 4, w: 6, h: 3 },
];

/* ================= HELPERS ================= */
const getWidgetTitle = (type: string) => {
  if (type === "graph") return "Graph";
  if (type === "pie_chart") return "Pie Chart";
  if (type === "action_log") return "Action Log";
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


  const removeWidgetFromLocalStorage = (widgetId: string) => {
    /* 1️⃣ Remove from dashboard_dynamic_widgets_v1 */
    const dynRaw = localStorage.getItem(DYNAMIC_WIDGETS_KEY);
    if (dynRaw) {
      const dyn = JSON.parse(dynRaw).filter(
        (w: any) => w.id !== widgetId
      );
      localStorage.setItem(
        DYNAMIC_WIDGETS_KEY,
        JSON.stringify(dyn)
      );
    }

    /* 2️⃣ Remove from dashboard_layout_v2 */
    const layoutRaw = localStorage.getItem(STORAGE_KEY);
    if (layoutRaw) {
      const layout = JSON.parse(layoutRaw).filter(
        (l: any) => l.id !== widgetId
      );
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(layout)
      );
    }
  };



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
      .catch(() => { });
  }, [user_token]);

  /* ================= GRID INIT ================= */
  useEffect(() => {
    if (!gridRef.current || grid.current) return;

    grid.current = GridStack.init(
      {
        column: 12,
        cellHeight: 90,
        margin: 12,
        staticGrid: false, // ✅ IMPORTANT
        draggable: { handle: ".dashboard-card-header" },
        resizable: { handles: "all" },
      },
      gridRef.current
    );

    setGridReady(true);
  }, []);

  /* ================= RESTORE GRID LAYOUT ================= */
  useEffect(() => {
    if (!grid.current || !gridReady) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    let layout = raw ? JSON.parse(raw) : [];

    // Ensure default widgets exist
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

  /* ================= REGISTER DYNAMIC WIDGETS ================= */
  useEffect(() => {
    if (!grid.current) return;

    dynamicWidgets.forEach((w) => {
      const el = document.querySelector(`[gs-id="${w.id}"]`) as HTMLElement | null;
      if (el) grid.current!.makeWidget(el);
    });

    window.dispatchEvent(new Event("resize"));
  }, [dynamicWidgets]);

  /* ================= EDIT MODE ================= */
  useEffect(() => {
    if (!grid.current) return;
    grid.current.setStatic(!editMode);
  }, [editMode]);

  /* ================= ADD WIDGET (FIXED) ================= */
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
                  : selectType == "top_host"
                    ? tophostConfig
                    : graphConfig,
        },
      ];

      localStorage.setItem(DYNAMIC_WIDGETS_KEY, JSON.stringify(next));
      return next;
    });

    setShowAddModal(false);
    setGraphConfig(null);
    setPieConfig(null);
    setItemConfig(null);
    setTophostConfig(null);
    setProblemSeverityConfig(null)
    setSelectType("");
  };

  /* ================= REMOVE WIDGETS ================= */
  const removeWidget = (id: string) => {
    hasUserModifiedWidgets.current = true;

    /* 1️⃣ Read dynamic widgets from localStorage */
    const dynamicWidgets: any[] = JSON.parse(
      localStorage.getItem(DYNAMIC_WIDGETS_KEY) || "[]"
    );

    const isDynamic = dynamicWidgets.some((w) => w.id === id);

    /* 2️⃣ Remove from React state (ONLY React touches DOM) */
    if (isDynamic) {
      setDynamicWidgets((prev) =>
        prev.filter((w) => w.id !== id)
      );
    }

    /* 3️⃣ Let GridStack update internal state ONLY */
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[gs-id="${id}"]`
      ) as HTMLElement | null;

      if (el && grid.current) {
        grid.current.removeWidget(el, false); // ✅ DO NOT remove DOM
      }

      /* 4️⃣ Compact grid */
      grid.current?.compact();
    });

    /* 5️⃣ Remove from localStorage */
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

  /* ================= UI ================= */
  return (
    <div style={{ width: "100%" }}>
      {/* TOOLBAR */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: 16 }}>
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

      {/* GRID */}
      <div className="grid-stack" ref={gridRef}>
        {WIDGETS.filter(w => !removedStaticIds.includes(w.id)).map(
          ({ id, title, component: Component, x, y, w, h }) => (
            <div key={id} className="grid-stack-item" gs-id={id} gs-x={x} gs-y={y} gs-w={w} gs-h={h}>
              <div className="grid-stack-item-content dashboard-card">
                <div className="dashboard-card-header">
                  {title}
                  {editMode && (
                    <span onClick={() => removeWidget(id)} style={{ float: "right", color: "red", cursor: "pointer" }}>
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
                {getWidgetTitle(w.type)}
                {editMode && (
                  <span onClick={() => removeWidget(w.id)} style={{ float: "right", color: "red", cursor: "pointer" }}>
                    ✖
                  </span>
                )}
              </div>
              <div className="dashboard-card-body">
                {w.type === "graph" && <Graph rangeData={rangeData} initialConfig={w.config} />}
                {w.type === "top_host" && (
                  <TopHost mode="preview" initialConfig={w.config} />
                )}

                {w.type === "pie_chart" && <PieChart initialConfig={w.config} />}
                {w.type === "item_value" && <ItemValue initialConfig={w.config} />}
                {w.type === "problems_by_severity" && <ProblemSeverity rangeData={rangeData} groupID={groupID} initialConfig={w.config} />}
                {w.type === "action_log" && <ActionLog />}
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
        onCancel={() => { setShowAddModal(false); setSelectType(""); }}
        onOk={handleAddWidget}
      >
        <Form layout="vertical">
          <Form.Item label="Type">
            <Select onChange={setSelectType} style={{ width: "70%" }}>
              {WIDGET_TYPES.map((v: any) => (
                <Select.Option key={v.value} value={v.value}>
                  {v.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectType === "graph" && <Graph rangeData={rangeData} onConfigChange={setGraphConfig} />}
          {selectType === "top_host" && (
            <TopHost mode="widget" onConfigChange={setTophostConfig} />
          )}

          {selectType === "pie_chart" && <PieChart onConfigChange={setPieConfig} />}
          {selectType === "item_value" && <ItemValue onConfigChange={setItemConfig} />}
          {selectType === "problems_by_severity" && <ProblemSeverity rangeData={rangeData} groupID={groupID} onConfigChange={setProblemSeverityConfig} />}
          {selectType === "action_log" && <ActionLog />}
        </Form>
      </Modal>
    </div>
  );
}
