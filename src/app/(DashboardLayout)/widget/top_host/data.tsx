"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Form, Select, Button, Table, Checkbox, Progress } from "antd";
import useZabbixData from "../three";
import ColumnModal, { ColumnConfig } from "./ColumnModal";

const formatBytes = (v: number) =>
  `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`;

const TopHost: React.FC = () => {
  const { hostGroups, hosts, items, fetchZabbixData } = useZabbixData();

  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([]);
  const [editing, setEditing] = useState<ColumnConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(false);

  /* GROUP BY HOST */
  const previewBlocks = useMemo(() => {
    const map = new Map<string, ColumnConfig[]>();

    columnsConfig.forEach((c) => {
      if (!map.has(c.hostName)) map.set(c.hostName, []);
      map.get(c.hostName)!.push(c);
    });

    return Array.from(map.entries());
  }, [columnsConfig]);

  /* ====== DRAG ON TABLE BODY (STABLE METHOD) ====== */
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tableWrapperRef.current) return;

    const body = tableWrapperRef.current.querySelector(
      ".ant-table-body"
    ) as HTMLDivElement | null;

    if (!body) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleDown = (e: MouseEvent) => {
      isDown = true;
      startX = e.pageX - body.offsetLeft;
      scrollLeft = body.scrollLeft;
      body.style.cursor = "grabbing";
      body.style.userSelect = "none";
    };

    const handleMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - body.offsetLeft;
      const walk = x - startX;
      body.scrollLeft = scrollLeft - walk;
    };

    const handleUp = () => {
      isDown = false;
      body.style.cursor = "grab";
      body.style.removeProperty("user-select");
    };

    body.style.cursor = "grab";

    body.addEventListener("mousedown", handleDown);
    body.addEventListener("mousemove", handleMove);
    body.addEventListener("mouseleave", handleUp);
    body.addEventListener("mouseup", handleUp);

    return () => {
      body.removeEventListener("mousedown", handleDown);
      body.removeEventListener("mousemove", handleMove);
      body.removeEventListener("mouseleave", handleUp);
      body.removeEventListener("mouseup", handleUp);
    };
  }, [preview, columnsConfig]);

  return (
    <>
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

        <Checkbox
          style={{ marginTop: 12 }}
          checked={preview}
          onChange={(e) => setPreview(e.target.checked)}
        >
          Show Preview
        </Checkbox>
      </Form>

      {/* ===== PREVIEW ===== */}
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

          const columns: any = [
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

                if (config.display === "bar" || units === "%") {
                  return (
                    <div style={{ minWidth: 120 }}>
                      <Progress
                        percent={Math.min(Number(raw), 100)}
                        size="small"
                      />
                    </div>
                  );
                }

                if (units?.toLowerCase().includes("b")) {
                  return (
                    <div style={{ textAlign: "right" }}>
                      {formatBytes(Number(raw))}
                    </div>
                  );
                }

                return (
                  <div style={{ textAlign: "right" }}>
                    {raw} {units}
                  </div>
                );
              },
            })),
          ];

          return (
            <div ref={tableWrapperRef} style={{ marginTop: 16 }}>
              <Table
                bordered
                size="small"
                pagination={false}
                scroll={{ x: "max-content" }}
                columns={columns}
                dataSource={rows}
              />
            </div>
          );
        })()}

      <ColumnModal
        open={open}
        hosts={hosts}
        items={items}
        initialData={editing}
        onHostChange={(h) => fetchZabbixData("item", [h])}
        onCancel={() => setOpen(false)}
        onSubmit={(c) => {
          setColumnsConfig((p) =>
            editing ? p.map((x) => (x.id === c.id ? c : x)) : [...p, c]
          );
          setEditing(null);
          setOpen(false);
        }}
      />
    </>
  );
};

export default TopHost;
