"use client";

import React, { useState } from "react";
import { Select, Input, Button, Radio, Space, Col, Row } from "antd";

const interfaceOptions = [
  { label: "Agent", value: "agent" },
  { label: "SNMP", value: "snmp" },
  { label: "JMX", value: "jmx" },
  { label: "IPMI", value: "ipmi" },
];

interface InterfaceProps {
  formdata: any;
  setFormdata: React.Dispatch<React.SetStateAction<any>>;
}

const Interface = ({ formdata, setFormdata }: InterfaceProps) => {
  console.log("formData", formdata);
  const [interfaces, setInterfaces] = useState<any[]>([]);

  const handleAddInterface = (selected: string[]) => {
    const last = selected[selected.length - 1];

    setInterfaces((prev) => {
      if (prev.some((i) => i.type === last)) return prev;

      return [
        ...prev,
        {
          id: Date.now(),
          type: last,
          ip: "127.0.0.1",
          dns: "",
          connectTo: "IP",
          port:
            last === "agent"
              ? "10050"
              : last === "snmp"
                ? "161"
                : last === "jmx"
                  ? "12345"
                  : "623",
          snmpVersion: "SNMPv2",
          snmpCommunity: "{$SNMP_COMMUNITY}",
        },
      ];
    });
    console.log("interface", interfaces)
  };
  const removeInterface = (id: number) => {
    setInterfaces((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div >
      <h2 style={{ marginBottom: 16 }}>Interfaces</h2>

      <Select
        size="large"
        mode="multiple"
        style={{ width: 400 }}
        options={interfaceOptions}
        placeholder="Add Interface"
        onChange={handleAddInterface}
      />

      <div style={{ marginTop: 24 }}>
        {interfaces.map((item) => (
          <div
            key={item.id}
            style={{
              borderBottom: "1px solid #ddd",
              paddingBottom: 20,
              marginBottom: 20,
            }}
          >
            <h3 style={{ marginBottom: 20, fontWeight: 500 }}>
              {item.type.toUpperCase() || ""}
            </h3>

            <Row gutter={20} align="top">
              <Col span={6}>
                <div className="field">
                  <label>IP address</label>
                  <Input
                    // value={item.ip}
                    value={formdata.ip}
                    onChange={(e) => {
                      setInterfaces((prev) =>
                        prev.map((i) =>
                          i.id === item.id ? { ...i, ip: e.target.value } : i
                        )
                      ),
                        setFormdata({ ...formdata, ip: e.target.value })
                    }
                    }
                  />
                </div>
              </Col>

              <Col span={6}>
                <div className="field">
                  <label>DNS name</label>
                  <Input
                    value={item.dns}
                    onChange={(e) =>
                      setInterfaces((prev) =>
                        prev.map((i) =>
                          i.id === item.id ? { ...i, dns: e.target.value } : i
                        )
                      )
                    }
                  />
                </div>
              </Col>

              <Col span={6}>
                <div className="field">
                  <label>Connect to</label>
                  <Radio.Group
                    // value={item.connectTo}
                    value={formdata.dns}
                    onChange={(e) => {
                      setInterfaces((prev) =>
                        prev.map((i) =>
                          i.id === item.id
                            ? { ...i, connectTo: e.target.value }
                            : i
                        )
                      ),
                        setFormdata({ ...formdata, dns: e.target.value })
                    }
                    }
                  >
                    <Space >
                      <Radio value="IP">IP</Radio>
                      <Radio value="DNS">DNS</Radio>
                    </Space>
                  </Radio.Group>
                </div>
              </Col>

              <Col span={4}>
                <div className="field">
                  <label>Port</label>
                  <Input
                    // value={item.port}
                    value={formdata.port}
                    onChange={(e) => {
                      setInterfaces((prev) =>
                        prev.map((i) =>
                          i.id === item.id ? { ...i, port: e.target.value } : i
                        )
                      ),
                        setFormdata({ ...formdata, port: e.target.value })
                    }
                    }
                  />
                </div>
              </Col>

              <Col span={2} style={{ textAlign: "right", marginTop: 28 }}>
                <Button danger type="link" onClick={() => { removeInterface(item.id) }}>
                  Remove
                </Button>
              </Col>
            </Row>

            {/* SNMP EXTRA */}
            {item.type === "snmp" && (
              <Row gutter={20} style={{ marginTop: 20 }}>
                <Col span={6}>
                  <label>SNMP Version</label>
                  <Select
                    value={item.snmpVersion}
                    onChange={(val) =>
                      setInterfaces((prev) =>
                        prev.map((i) =>
                          i.id === item.id ? { ...i, snmpVersion: val } : i
                        )
                      )
                    }
                    options={[
                      { label: "SNMPv1", value: "SNMPv1" },
                      { label: "SNMPv2", value: "SNMPv2" },
                      { label: "SNMPv3", value: "SNMPv3" },
                    ]}
                    style={{ width: "100%" }}
                  />
                </Col>

                <Col span={10}>
                  <label>SNMP Community</label>
                  <Input
                    value={item.snmpCommunity}
                    onChange={(e) =>
                      setInterfaces((prev) =>
                        prev.map((i) =>
                          i.id === item.id
                            ? { ...i, snmpCommunity: e.target.value }
                            : i
                        )
                      )
                    }
                  />
                </Col>
              </Row>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .field label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default Interface;
