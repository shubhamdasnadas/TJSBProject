"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Input, Select, Row, Col, Form } from "antd";
import axios from "axios";
import Interface from "./Interface";
import HostFilterCard from "./HostFilterCard";

const Host = () => {
  const user_token = localStorage.getItem("zabbix_auth");

  const [title, setTitle] = useState("Create Host");
  const [modal2Open, setModal2Open] = useState(false);

  const [templateGrouplist, setTemplategrouplist] = useState([]);
  const [templateList, setTemplateList] = useState([]);
  const [host_group, setHost_group] = useState([]);

  const [filterHost, setFilterHost] = useState([]);
  const [updateFilter, setUpdateFilter] = useState([]);

  const [formData, setFormData] = useState({
    auth: user_token,
    host: "",
    type: 1,
    main: 1,
    useip: 1,
    ip: "",
    port: "",
    dns: "",
    groupid: [],
  });

  const [filterFormData, setFilterFormData] = useState({
    name: "",
    groupid: [],
    ip: "",
    dns: "",
    port: "",
    severity: "",
    status: "",
  });

  const handleApply = async () => {
    console.log("Filter Data:", filterFormData);
    try {
      const res = await axios.post(
        "http://localhost:3000/api/api_host/api_getdata_host",
        {
          auth: user_token,
          groupid: filterFormData.groupid,
        }
      );
      setUpdateFilter(res.data.result || []);
    } catch {
      console.log("Error getting host data");
    }
  };

  const handleGetHostGroup = async () => {
    try {
      const res = await axios.post(
        "http://localhost:3000/api/api_host/api_host_group",
        {
          auth: user_token,
        }
      );
      setHost_group(res.data.result);
      setFilterHost(res.data.result);
    } catch {
      console.log("Error host group");
    }
  };

  const handleGetTemplateList = async (groupid: string) => {
    try {
      const response = await axios.post(
        "http://localhost:3000/api/api_host/api_template",
        {
          auth: user_token,
          groupids: [groupid],
        }
      );
      setTemplateList(response.data.result);
    } catch {


      console.log("error template list");
    }
  };


  const handleClick = async () => {
    try {
      const response = await axios.post(
        "http://localhost:3000/api/api_host/api_template_group",
        {
          auth: user_token,
        }
      );
      setTemplategrouplist(response.data.result);
    } catch {
      console.log("error template group");
    }
  };

  const handleCreateHost = async () => {
    try {
      const res = await axios.post(
        "http://localhost:3000/api/api_host/api_create_host",
        formData
      );
      console.log("Host created:", res.data);
      setModal2Open(false);
    } catch (error) {
      console.error("Error creating host:", error);
    }
  };

  useEffect(() => {
    handleGetHostGroup();
  }, []);

  return (
    <>
      {/* Modal */}
      <Modal
        centered
        title={title}
        open={modal2Open}
        onOk={handleCreateHost}
        onCancel={() => setModal2Open(false)}
        width={900}
      >
        <Form layout="vertical">
          <Row gutter={[24, 24]}>
            <Col span={12}>
              <Form.Item label="Host Name" required>
                <Input
                  value={formData.host}
                  onChange={(e) =>
                    setFormData({ ...formData, host: e.target.value })
                  }
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Visible Name" required>
                <Input placeholder="Enter visible name" />
              </Form.Item>
            </Col>
          </Row>

          {/* Template Group */}
          <Row gutter={[24, 24]}>
            <Col span={12}>
              <Form.Item label="Template Group">
                <Select onChange={(e) => { handleClick(), handleGetTemplateList(e as any) }}>
                  {templateGrouplist.map((v: any) => (
                    <Select.Option key={v.groupid} value={v.groupid}>
                      {v.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item label="Template">
                <Select>
                  {templateList.map((v: any) => (
                    <Select.Option key={v.host} value={v.host}>
                      {v.host}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Host Group */}
          <Row gutter={[24, 24]}>
            <Col span={12}>
              <Form.Item label="Host Group">
                <Select
                  mode="multiple"
                  onChange={(e) =>
                    setFormData({ ...formData, groupid: e })
                  }
                >
                  {host_group.map((v: any) => (
                    <Select.Option key={v.groupid} value={v.groupid}>
                      {v.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Interface Component */}
          <Interface formdata={formData} setFormdata={setFormData} />

        </Form>
      </Modal>

      {/* Create Host Button */}
      <div style={{ display: "flex", justifyContent: "flex-end", margin: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setModal2Open(true);
            setTitle("New Host");
            handleClick();
            handleGetHostGroup();
          }}
        >
          {title}
        </Button>
      </div>

      {/* Host Filter Card */}
      <HostFilterCard
        filterHost={filterHost}
        filterFormData={filterFormData}
        setFilterFormData={setFilterFormData}
        handleapply={handleApply}
        updateFilter={updateFilter}
      />
    </>
  );
};

export default Host;
