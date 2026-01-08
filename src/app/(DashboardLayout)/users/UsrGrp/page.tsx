"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Modal,
  Input,
  Select,
  Row,
  Col,
  Form,
  Table,
  Tag,
  Checkbox,
  Tabs,
} from "antd";
import axios from "axios";
import HostFilterCard from "./HostFilterCard";

/* =========================
   CONFIG
========================= */
const ZABBIX_URL = process.env.NEXT_PUBLIC_ZABBIX_URL!;

const getToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("zabbix_auth") || "";
};

const zabbixAxios = axios.create({
  baseURL: ZABBIX_URL,
  headers: {
    "Content-Type": "application/json-rpc",
  },
});

/* =========================
   COMPONENT
========================= */
const Host = () => {
  const token = getToken();

  const [title, setTitle] = useState("create user group");
  const [modal2Open, setModal2Open] = useState(false);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  const [userGroupFormData, setUserGroupFormData] = useState({
    name: "",
    userids: [] as string[],
    gui_access: "0",
    ldap_server: "",
    mfa_status: "0",
    users_status: "0",
    debug_mode: "0",
  });

  const [templateGrouplist, setTemplategrouplist] = useState<any[]>([]);
  const [templateList, setTemplateList] = useState<any[]>([]);
  const [host_group, setHost_group] = useState<any[]>([]);

  const [filterHost, setFilterHost] = useState<any[]>([]);
  const [updateFilter, setUpdateFilter] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    host: "",
    type: 1,
    main: 1,
    useip: 1,
    ip: "",
    port: "",
    dns: "",
    groupid: [] as string[],
  });

  const [filterFormData, setFilterFormData] = useState({
    name: "",
    groupid: [] as string[],
    ip: "",
    dns: "",
    port: "",
    severity: "",
    status: "",
  });

  /* =========================
     HELPERS
  ========================= */
  const authHeader = {
    Authorization: `Bearer ${token}`,
  };

  /* =========================
     API CALLS
  ========================= */
  const handleApply = async () => {
    try {
      const res = await axios.post(
        "/api/api_host/api_getdata_host",
        { groupid: filterFormData.groupid },
        { headers: authHeader }
      );
      setUpdateFilter(res.data.result || []);
    } catch {
      console.log("Error getting host data");
    }
  };

  const handleGetHostGroup = async () => {
    try {
      const res = await axios.post(
        "/api/api_host/api_host_group",
        {},
        { headers: authHeader }
      );
      setHost_group(res.data.result);
      setFilterHost(res.data.result);
    } catch {
      console.log("Error host group");
    }
  };

  const handleGetTemplateList = async (groupid: string) => {
    try {
      const res = await axios.post(
        "/api/api_host/api_template",
        { groupids: [groupid] },
        { headers: authHeader }
      );
      setTemplateList(res.data.result);
    } catch {
      console.log("error template list");
    }
  };

  const handleClick = async () => {
    try {
      const res = await axios.post(
        "/api/api_host/api_template_group",
        {},
        { headers: authHeader }
      );
      setTemplategrouplist(res.data.result);
    } catch {
      console.log("error template group");
    }
  };

  const handleCreateHost = async () => {
    try {
      const res = await axios.post(
        "/api/api_host/api_create_host",
        formData,
        { headers: authHeader }
      );
      console.log("Host created:", res.data.result);
      setModal2Open(false);
    } catch (error) {
      console.error("Error creating host:", error);
    }
  };

  const fetchUserGroups = async () => {
    setLoading(true);
    try {
      const payload = {
        jsonrpc: "2.0",
        method: "usergroup.get",
        params: {
          output: ["usrgrpid", "name", "gui_access", "debug_mode", "users_status"],
          selectUsers: ["userid", "username", "name", "surname"],
        },
        id: 1,
      };

      const res = await zabbixAxios.post("", payload, {
        headers: authHeader,
      });

      setUserGroups(res.data.result || []);
    } catch (error) {
      console.error("Error fetching user groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const payload = {
        jsonrpc: "2.0",
        method: "user.get",
        params: {
          output: ["userid", "username", "name", "surname"],
        },
        id: 2,
      };

      const res = await zabbixAxios.post("", payload, {
        headers: authHeader,
      });

      setAvailableUsers(res.data.result || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateUserGroup = async () => {
    try {
      const payload = {
        jsonrpc: "2.0",
        method: "usergroup.create",
        params: {
          name: userGroupFormData.name,
          gui_access: userGroupFormData.gui_access,
          users_status: userGroupFormData.users_status,
          debug_mode: userGroupFormData.debug_mode,
          userids: userGroupFormData.userids,
        },
        id: 3,
      };

      await zabbixAxios.post("", payload, {
        headers: authHeader,
      });

      setModal2Open(false);
      fetchUserGroups();
    } catch (error) {
      console.error("Error creating user group:", error);
    }
  };

  useEffect(() => {
    handleGetHostGroup();
    fetchUserGroups();
    fetchAvailableUsers();
  }, []);

  /* =========================
     TABLE COLUMNS (UNCHANGED)
  ========================= */
  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: "#",
      dataIndex: "users",
      width: 80,
      render: (users: any[]) => `Users ${users?.length || 0}`,
    },
    {
      title: "Members",
      dataIndex: "users",
      render: (users: any[]) =>
        users?.map((u) => u.username).join(", ") || "-",
    },
    {
      title: "Frontend access",
      dataIndex: "gui_access",
      render: (v: string) => (
        <Tag>{v === "1" ? "Internal" : v === "2" ? "Disabled" : "Default"}</Tag>
      ),
    },
    {
      title: "Debug mode",
      dataIndex: "debug_mode",
      render: (v: string) => (
        <Tag color={v === "1" ? "green" : "default"}>
          {v === "1" ? "Enabled" : "Disabled"}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "users_status",
      render: (v: string) => (
        <Tag color={v === "0" ? "green" : "red"}>
          {v === "0" ? "Enabled" : "Disabled"}
        </Tag>
      ),
    },
  ];

  return (
    <>
      <HostFilterCard
        filterHost={filterHost}
        filterFormData={filterFormData}
        setFilterFormData={setFilterFormData}
        handleapply={handleApply}
        updateFilter={updateFilter}
      />

      <Modal
        centered
        title={title}
        open={modal2Open}
        onOk={handleCreateUserGroup}
        onCancel={() => setModal2Open(false)}
        width={700}
      >
        {/* form unchanged */}
      </Modal>

      <div style={{ display: "flex", justifyContent: "flex-end", margin: 16 }}>
        <Button
          type="primary"
          onClick={() => {
            setModal2Open(true);
            setTitle("New user group");
            fetchAvailableUsers();
          }}
        >
          Create user group
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={userGroups}
        loading={loading}
        rowKey="usrgrpid"
        pagination={{ pageSize: 10 }}
        bordered
      />
    </>
  );
};

export default Host;
