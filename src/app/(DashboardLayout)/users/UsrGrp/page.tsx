 "use client";

import { useEffect, useState } from "react";
import { Button, Modal, Input, Select, Row, Col, Form, Table, Tag, Checkbox, Tabs } from "antd";
import axios from "axios";
import HostFilterCard from "./HostFilterCard";

const Host = () => {
  const user_token = localStorage.getItem("zabbix_auth");

  const [title, setTitle] = useState("create user group ");
  const [modal2Open, setModal2Open] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);

  const [userGroupFormData, setUserGroupFormData] = useState({
    name: "",
    userids: [] as string[],
    gui_access: "0",
    ldap_server: "",
    mfa_status: "0",
    users_status: "0",
    debug_mode: "0",
  });

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
        auth: user_token,
        id: 1,
      };

      const res = await axios.post("/api/zabbix-proxy", payload);
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
        auth: user_token,
        id: 2,
      };

      const res = await axios.post("/api/zabbix-proxy", payload);
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
        auth: user_token,
        id: 3,
      };

      const res = await axios.post("/api/zabbix-proxy", payload);
      console.log("User group created:", res.data);
      setModal2Open(false);
      fetchUserGroups();
      // Reset form
      setUserGroupFormData({
        name: "",
        userids: [],
        gui_access: "0",
        ldap_server: "",
        mfa_status: "0",
        users_status: "0",
        debug_mode: "0",
      });
    } catch (error) {
      console.error("Error creating user group:", error);
    }
  };

  useEffect(() => {
    handleGetHostGroup();
    fetchUserGroups();
    fetchAvailableUsers();
  }, []);

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string) => (
        <a className="text-blue-500 hover:text-blue-700">{text}</a>
      ),
    },
    {
      title: "#",
      dataIndex: "users",
      key: "count",
      width: 80,
      render: (users: any[]) => (
        <a className="text-blue-500 hover:text-blue-700">
          Users {users?.length || 0}
        </a>
      ),
    },
    {
      title: "Members",
      dataIndex: "users",
      key: "members",
      render: (users: any[]) => {
        if (!users || users.length === 0) return "-";
        return users
          .map((user) => {
            const displayName = user.username || user.name || user.userid;
            const fullName = user.name && user.surname 
              ? `${user.name} ${user.surname}` 
              : user.name || "";
            return fullName ? `${user.username} (${fullName})` : displayName;
          })
          .join(", ");
      },
    },
    {
      title: "Frontend access",
      dataIndex: "gui_access",
      key: "gui_access",
      render: (access: string) => {
        const accessMap: any = {
          "0": { text: "System default", color: "default" },
          "1": { text: "Internal", color: "orange" },
          "2": { text: "Disabled", color: "red" },
        };
        const accessInfo = accessMap[access] || { text: "System default", color: "default" };
        return <Tag color={accessInfo.color}>{accessInfo.text}</Tag>;
      },
    },
    {
      title: "Debug mode",
      dataIndex: "debug_mode",
      key: "debug_mode",
      render: (mode: string) => {
        const isEnabled = mode === "1";
        return (
          <Tag color={isEnabled ? "green" : "default"}>
            {isEnabled ? "Enabled" : "Disabled"}
          </Tag>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "users_status",
      key: "status",
      render: (status: string) => {
        const isEnabled = status === "0";
        return (
          <Tag color={isEnabled ? "green" : "red"}>
            {isEnabled ? "Enabled" : "Disabled"}
          </Tag>
        );
      },
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

      {/* Modal */}
      <Modal
        centered
        title={title}
        open={modal2Open}
        onOk={handleCreateUserGroup}
        onCancel={() => setModal2Open(false)}
        width={700}
        okText="Add"
        cancelText="Cancel"
      >
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: "1",
              label: "User group",
              children: (
                <Form layout="vertical">
                  <Form.Item label={<span><span style={{ color: 'red' }}>*</span> Group name</span>} required>
                    <Input
                      value={userGroupFormData.name}
                      onChange={(e) =>
                        setUserGroupFormData({ ...userGroupFormData, name: e.target.value })
                      }
                    />
                  </Form.Item>

                  <Form.Item label="Users">
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Input
                        placeholder="type here to search"
                        style={{ flex: 1 }}
                      />
                      <Button
                        onClick={() => {
                          // Open user selection modal or dropdown
                        }}
                      >
                        Select
                      </Button>
                    </div>
                    <Select
                      mode="multiple"
                      value={userGroupFormData.userids}
                      onChange={(value) =>
                        setUserGroupFormData({ ...userGroupFormData, userids: value })
                      }
                      style={{ width: '100%', marginTop: 8 }}
                      placeholder="Select users"
                    >
                      {availableUsers.map((user: any) => (
                        <Select.Option key={user.userid} value={user.userid}>
                          {user.username} {user.name && user.surname ? `(${user.name} ${user.surname})` : ''}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item label="Frontend access">
                    <Select
                      value={userGroupFormData.gui_access}
                      onChange={(value) =>
                        setUserGroupFormData({ ...userGroupFormData, gui_access: value })
                      }
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="0">System default</Select.Option>
                      <Select.Option value="1">Internal</Select.Option>
                      <Select.Option value="2">LDAP</Select.Option>
                      <Select.Option value="3">Disabled</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="LDAP Server">
                    <Select
                      value={userGroupFormData.ldap_server}
                      onChange={(value) =>
                        setUserGroupFormData({ ...userGroupFormData, ldap_server: value })
                      }
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="">Default</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item label="Multi-factor authentication">
                    <Select
                      value={userGroupFormData.mfa_status}
                      onChange={(value) =>
                        setUserGroupFormData({ ...userGroupFormData, mfa_status: value })
                      }
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="0">Disabled</Select.Option>
                      <Select.Option value="1">Enabled</Select.Option>
                    </Select>
                  </Form.Item>

                  <Form.Item>
                    <Checkbox
                      checked={userGroupFormData.users_status === "0"}
                      onChange={(e) =>
                        setUserGroupFormData({
                          ...userGroupFormData,
                          users_status: e.target.checked ? "0" : "1",
                        })
                      }
                    >
                      Enabled
                    </Checkbox>
                  </Form.Item>

                  <Form.Item>
                    <Checkbox
                      checked={userGroupFormData.debug_mode === "1"}
                      onChange={(e) =>
                        setUserGroupFormData({
                          ...userGroupFormData,
                          debug_mode: e.target.checked ? "1" : "0",
                        })
                      }
                    >
                      Debug mode
                    </Checkbox>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: "2",
              label: "Template permissions",
              children: <div>Template permissions content</div>,
            },
            {
              key: "3",
              label: "Host permissions",
              children: <div>Host permissions content</div>,
            },
            {
              key: "4",
              label: "Problem tag filter",
              children: <div>Problem tag filter content</div>,
            },
          ]}
        />
      </Modal>

      {/* Create Host Button */}
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

       <b> User Groups Table </b>
      <div style={{ margin: 16 }}>
        <Table
          columns={columns}
          dataSource={userGroups}
          loading={loading}
          rowKey="usrgrpid"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
          }}
          bordered
        />
      </div>

       
    </>
  );
};

export default Host;
																				