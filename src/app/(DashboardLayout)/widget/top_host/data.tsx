"use client";

import React, {
  useState,
  useMemo,
  useContext,
  useEffect,
} from "react";

import {
  DndContext,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { HolderOutlined } from "@ant-design/icons";

import {
  Form,
  Select,
  Button,
  Table,
  Progress,
} from "antd";

import useZabbixData from "../three";
import ColumnModal, { ColumnConfig } from "./ColumnModal";

/* ------------ helpers ------------ */

const formatBytes = (v: number) =>
  `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`;

interface RowContextProps {
  setActivatorNodeRef?: (el: HTMLElement | null) => void;
  listeners?: any;
}

const RowContext = React.createContext<RowContextProps>({});

const DragHandle: React.FC = () => {
  const { setActivatorNodeRef, listeners } = useContext(RowContext);

  return (
    <Button
      type="text"
      size="small"
      icon={<HolderOutlined />}
      style={{ cursor: "move" }}
      ref={setActivatorNodeRef}
      {...listeners}
    />
  );
};

const SortableRow: React.FC<any> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props["data-row-key"],
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 10 } : {}),
  };

  return (
    <RowContext.Provider value={{ setActivatorNodeRef, listeners }}>
      <tr {...props} ref={setNodeRef} style={style} {...attributes} />
    </RowContext.Provider>
  );
};

interface TopHostProps {
  mode?: "preview" | "widget";
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
}

const TopHost: React.FC<TopHostProps> = ({
  mode = "widget",
  onConfigChange,
  initialConfig,
}) => {
  const { hostGroups, hosts, items, fetchZabbixData } = useZabbixData();

  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  const [editing, setEditing] = useState<ColumnConfig | null>(null);
  const [open, setOpen] = useState(false);

  // FORCE preview ON when mode === preview
  const preview = mode === "preview" ? true : false;

  /* restore config when widget opened */
  useEffect(() => {
    if (initialConfig?.columns) {
      setColumnsConfig(initialConfig.columns);
    }
  }, [initialConfig]);

  /* send config to dashboard when editing */
  useEffect(() => {
    if (!onConfigChange) return;

    onConfigChange({
      columns: columnsConfig,
    });
  }, [columnsConfig, onConfigChange]);

  /* grouped rows */
  const previewBlocks = useMemo(() => {
    const map = new Map<string, ColumnConfig[]>();

    columnsConfig.forEach((c) => {
      if (!map.has(c.hostName)) map.set(c.hostName, []);
      map.get(c.hostName)!.push(c);
    });

    return Array.from(map.entries());
  }, [columnsConfig]);

  const [rowOrder, setRowOrder] = useState<string[]>([]);

  useEffect(() => {
    setRowOrder(previewBlocks.map(([host]) => host));
  }, [previewBlocks]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    setRowOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <>
      {/* 🟢 BUILDER ONLY — NOT IN DASHBOARD */}
      {mode === "widget" && (
        <Form layout="vertical">
          <Form.Item label="Host Groups">
            <Select
              mode="multiple"
              onChange={(g) => fetchZabbixData("host", g)}
              options={hostGroups.map((g) => ({
                label: g.name,
                value: g.groupid,
              }))}
            />
          </Form.Item>

          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add Column
          </Button>

          <Table
            style={{ marginTop: 12 }}
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={columnsConfig}
            columns={[
              { title: "Name", dataIndex: "name" },
              { title: "Host", dataIndex: "hostName" },
              { title: "Item", dataIndex: "itemName" },
              {
                title: "Action",
                render: (_, r) => (
                  <>
                    <a
                      onClick={() => {
                        setEditing(r);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </a>{" "}
                    |{" "}
                    <a
                      onClick={() =>
                        setColumnsConfig((p) =>
                          p.filter((x) => x.id !== r.id)
                        )
                      }
                    >
                      Remove
                    </a>
                  </>
                ),
              },
            ]}
          />
        </Form>
      )}

      {/* 🟡 DASHBOARD VIEW — ONLY TABLE */}
      {preview &&
        (() => {
          const rows = previewBlocks.map(([host, cols]) => {
            const row: any = { key: host, host };

            cols.forEach((c) => {
              const snap = c.itemSnapshot;

              if (!snap) {
                row[c.name] = { raw: null, units: "" };
                return;
              }

              const raw = Number(snap.lastvalue ?? 0);
              const value = Number(raw.toFixed(c.decimals ?? 2));
              const units = snap.units ?? "";

              row[c.name] = { raw: value, units, config: c };
            });

            return row;
          });

          const orderedRows = rowOrder
            .map((h) => rows.find((r) => r.key === h))
            .filter(Boolean);

          const columns: any = [
            {
              key: "sort",
              width: 60,
              render: () => <DragHandle />,
              align: "center",
            },
            {
              title: "host name",
              dataIndex: "host",
            },

            ...columnsConfig.map((c) => ({
              title: c.name,
              dataIndex: c.name,

              render: (v: any) => {
                if (!v || v.raw === null) return "-";

                const { raw, units, config } = v;
                const value = Number(raw);

                if (config.display === "as_is") {
                  return (
                    <span
                      style={{
                        fontWeight: value > 90 ? "bold" : "normal",
                        color: value > 90 ? "#ff4d4f" : undefined,
                      }}
                    >
                      {value} {units}
                    </span>
                  );
                }

                if (config.display === "bar") {
                  let color = "#52c41a";

                  if (config.thresholds?.length) {
                    const m = config.thresholds.find(
                      (t: any) => value >= t.from && value <= t.to
                    );
                    if (m) color = m.color;
                  }

                  return (
                    <div style={{ minWidth: 140 }}>
                      <Progress
                        percent={Math.min(value, 100)}
                        size="small"
                        strokeColor={color}
                        showInfo={false}
                      />

                      <div style={{ textAlign: "right" }}>
                        {value} {units}
                      </div>
                    </div>
                  );
                }

                return `${value} ${units ?? ""}`;
              },
            })),
          ];

          return (
            <DndContext onDragEnd={onDragEnd}>
              <SortableContext
                items={orderedRows.map((r) => r.key)}
                strategy={verticalListSortingStrategy}
              >
                <Table
                  bordered
                  size="small"
                  pagination={false}
                  rowKey="key"
                  components={{ body: { row: SortableRow } }}
                  columns={columns}
                  dataSource={orderedRows}
                  style={{ marginTop: 16 }}
                  scroll={{ x: "max-content" }}
                />
              </SortableContext>
            </DndContext>
          );
        })()}

      {/* modal stays same */}
      <ColumnModal
        open={open}
        hosts={hosts}
        items={items}
        initialData={editing}
        onHostChange={(h) => fetchZabbixData("item", [h])}
        onCancel={() => setOpen(false)}
        onSubmit={(c) => {
          setColumnsConfig((p) =>
            editing
              ? p.map((x) => (x.id === c.id ? c : x))
              : [...p, c]
          );
          setEditing(null);
          setOpen(false);
        }}
      />
    </>
  );
};

export default TopHost;
