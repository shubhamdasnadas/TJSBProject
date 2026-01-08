"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Form, Modal, Select } from "antd";
import axios from "axios";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";

import { WIDGET_TYPES } from "./widget/widgetRegistry";
import DashboardSummaryCount from "./DashboardSummaryCount";
import ProblemsTablePage from "./ProblemsTable";
import RangePickerDemo from "./RangePickerDemo";

import ActionLog from "./widget/actionLog";
import Graph from "./widget/graph";
import PieChart from "./widget/pie_chart";
import ItemValue from "./widget/itemvalue";
import ProblemSeverity from "./Problemseverity";
import TopHost from "./widget/top_host/data";

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
    x: 0,
    y: 2,
    w: 12,
    h: 4,
  },
];

/* ================= HELPERS ================= */
const getWidgetTitle = (type: string) => {
  if (type === "graph") return "Graph";
  if (type === "pie_chart") return "Pie Chart";
  if (type === "action_log") return "Action Log";
  if (type === "item_value") return "Item Value";
  if (type === "top_host") return "Top Host";
  if (type === "problems_by_severity") return "Problem Severity";
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

  /* ================= LOAD SAVED STATE ================= */
  useEffect(() => {
    const dyn = localStorage.getItem(DYNAMIC_WIDGETS_KEY);
    const removed = localStorage.getItem(REMOVED_STATIC_KEY);

    if (dyn) setDynamicWidgets(JSON.parse(dyn));
    if (removed) setRemovedStaticIds(JSON.parse(removed));

    hasLoadedFromStorage.current = true;
  }, []);

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
    const layout = raw ? JSON.parse(raw) : [];

    WIDGETS.forEach((w) => {
      if (!layout.find((l: any) => l.id === w.id)) {
        layout.push({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h });
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));

    requestAnimationFrame(() => {
      grid.current!.load(layout);
      window.dispatchEvent(new Event("resize"));
    });
  }, [gridReady]);

  /* ================= ADD WIDGET ================= */
  const handleAddWidget = () => {
    if (!selectType) return;

    const id = `${selectType}-${Date.now()}`;

    const config =
      selectType === "graph"
        ? graphConfig
        : selectType === "pie_chart"
        ? pieConfig
        : selectType === "item_value"
        ? itemConfig
        : selectType === "top_host"
        ? tophostConfig
        : selectType === "problems_by_severity"
        ? problemSeverityConfig
        : null;

    const next = [...dynamicWidgets, { id, type: selectType, config }];

    setDynamicWidgets(next);
    localStorage.setItem(DYNAMIC_WIDGETS_KEY, JSON.stringify(next));

    setShowAddModal(false);
    setSelectType("");
  };

  /* ================= UI ================= */
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: 16 }}>
        <Button onClick={() => setEditMode(!editMode)}>
          {editMode ? "Save Dashboard" : "Edit Dashboard"}
        </Button>
        {editMode && (
          <Button type="dashed" onClick={() => setShowAddModal(true)}>
            Add Widget
          </Button>
        )}
        <RangePickerDemo onRangeChange={setRangeData} />
      </div>

      <div className="grid-stack" ref={gridRef}>
        {dynamicWidgets.map((w) => (
          <div key={w.id} className="grid-stack-item" gs-id={w.id} gs-w="6" gs-h="4">
            <div className="grid-stack-item-content dashboard-card">
              <div className="dashboard-card-header">{getWidgetTitle(w.type)}</div>
              <div className="dashboard-card-body">
                {w.type === "graph" && <Graph rangeData={rangeData} initialConfig={w.config} />}
                {w.type === "top_host" && <TopHost mode="preview" initialConfig={w.config} />}
                {w.type === "pie_chart" && <PieChart initialConfig={w.config} />}
                {w.type === "item_value" && <ItemValue initialConfig={w.config} />}
                {w.type === "problems_by_severity" && (
                  <ProblemSeverity rangeData={rangeData} groupID={groupID} initialConfig={w.config} />
                )}
                {w.type === "action_log" && <ActionLog />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        title="Add Widget"
        open={showAddModal}
        width={900}
        onCancel={() => setShowAddModal(false)}
        onOk={handleAddWidget}
      >
        <Form layout="vertical">
          <Form.Item label="Widget Type">
            <Select onChange={setSelectType}>
              {WIDGET_TYPES.map((w: any) => (
                <Select.Option key={w.value} value={w.value}>
                  {w.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {selectType === "graph" && <Graph rangeData={rangeData} onConfigChange={setGraphConfig} />}
          {selectType === "top_host" && <TopHost mode="widget" onConfigChange={setTophostConfig} />}
          {selectType === "pie_chart" && <PieChart onConfigChange={setPieConfig} />}
          {selectType === "item_value" && <ItemValue onConfigChange={setItemConfig} />}
          {selectType === "problems_by_severity" && (
            <ProblemSeverity rangeData={rangeData} groupID={groupID} onConfigChange={setProblemSeverityConfig} />
          )}
          {selectType === "action_log" && <ActionLog />}
        </Form>
      </Modal>
    </div>
  );
}
