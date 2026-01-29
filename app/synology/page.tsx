'use client';

import { useState, useEffect } from 'react';
import { Select, Table, Checkbox, Button, message, Spin, Alert, Tag, Card, Space, Divider } from 'antd';
import { UserOutlined, ReloadOutlined, SafetyCertificateOutlined, FolderOpenOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import type { SynoUser, Permission, PermissionType } from '../permissions/types';
import '../styles/permissions.css';

const { Option } = Select;

export default function SynologyPermissionsPage() {
  const [users, setUsers] = useState<SynoUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setInitialLoading(true);
      setError(null);

      const response = await fetch('/api/synology-users');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setUsers(data.data.users);
      } else {
        setError(`API Error: ${data.error?.code || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      message.error('Failed to load users');
    } finally {
      setInitialLoading(false);
    }
  };

  const fetchPermissions = async (username: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch shares/folders
      const sharesResponse = await fetch('/api/synology-shares');
      const sharesData = await sharesResponse.json();

      // Fetch user permissions
      const userPermsResponse = await fetch('/api/synology-permissions/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const userPermsData = await userPermsResponse.json();

      // Fetch group permissions
      const groupPermsResponse = await fetch('/api/synology-permissions/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const groupPermsData = await groupPermsResponse.json();

      // Mock data structure based on the image
      const mockPermissions: Permission[] = [
        {
          name: 'Account-Finance',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: true, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'Admin-IT',
          preview: 'Read/Write',
          groupPermissions: '-',
          userPermissions: { noAccess: false, readWrite: true, readOnly: false, custom: false }
        },
        {
          name: 'Architect',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: true, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'BD',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: true, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'BDODATA',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: false, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'BM',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: false, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'Commedge',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: false, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'Compliance',
          preview: 'Customize',
          groupPermissions: '-',
          userPermissions: { noAccess: false, readWrite: false, readOnly: false, custom: true }
        },
        {
          name: 'Construction_Management',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: true, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'Crm-Sales',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: true, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'HR',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: true, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'Internal_Audit',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: false, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'L-SECTEC',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: false, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'Legal',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: true, readWrite: false, readOnly: false, custom: false }
        },
        {
          name: 'LOGS',
          preview: 'No Access',
          groupPermissions: '-',
          userPermissions: { noAccess: false, readWrite: false, readOnly: false, custom: false }
        }
      ];

      setPermissions(mockPermissions);
      message.success(`Loaded permissions for ${username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch permissions');
      message.error('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleUserChange = (value: string) => {
    setSelectedUser(value);
    fetchPermissions(value);
  };

  const handlePermissionChange = (record: Permission, type: 'noAccess' | 'readWrite' | 'readOnly' | 'custom') => {
    setPermissions(prevPermissions =>
      prevPermissions.map(perm =>
        perm.name === record.name
          ? {
              ...perm,
              userPermissions: {
                noAccess: type === 'noAccess',
                readWrite: type === 'readWrite',
                readOnly: type === 'readOnly',
                custom: type === 'custom'
              }
            }
          : perm
      )
    );
  };

  const columns: TableColumnsType<Permission> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 220,
      fixed: 'left',
      render: (text: string) => (
        <div className="folder-name">
          <FolderOpenOutlined className="folder-icon" />
          <span>{text}</span>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Preview',
      dataIndex: 'preview',
      key: 'preview',
      width: 140,
      render: (text: string) => {
        const colorMap: Record<string, string> = {
          'No Access': 'red',
          'Read/Write': 'orange',
          'Read Only': 'blue',
          'Customize': 'purple'
        };
        return (
          <Tag color={colorMap[text] || 'default'} className="preview-tag">
            {text}
          </Tag>
        );
      },
      filters: [
        { text: 'No Access', value: 'No Access' },
        { text: 'Read/Write', value: 'Read/Write' },
        { text: 'Read Only', value: 'Read Only' },
        { text: 'Customize', value: 'Customize' },
      ],
      onFilter: (value, record) => record.preview === value,
    },
    {
      title: 'Group Permissions',
      dataIndex: 'groupPermissions',
      key: 'groupPermissions',
      width: 150,
      align: 'center',
      render: (text: string) => (
        <span className="group-permission">{text}</span>
      )
    },
    {
      title: 'User Permissions',
      key: 'userPermissions',
      children: [
        {
          title: (
            <div className="permission-header">
              <span className="permission-icon">🚫</span>
              <span>No Access</span>
            </div>
          ),
          key: 'noAccess',
          width: 120,
          align: 'center',
          render: (_: any, record: Permission) => (
            <Checkbox
              checked={record.userPermissions.noAccess}
              onChange={() => handlePermissionChange(record, 'noAccess')}
              className="permission-checkbox"
            />
          )
        },
        {
          title: (
            <div className="permission-header">
              <span className="permission-icon">✏️</span>
              <span>Read/Write</span>
            </div>
          ),
          key: 'readWrite',
          width: 120,
          align: 'center',
          render: (_: any, record: Permission) => (
            <Checkbox
              checked={record.userPermissions.readWrite}
              onChange={() => handlePermissionChange(record, 'readWrite')}
              className="permission-checkbox"
            />
          )
        },
        {
          title: (
            <div className="permission-header">
              <span className="permission-icon">👁️</span>
              <span>Read Only</span>
            </div>
          ),
          key: 'readOnly',
          width: 120,
          align: 'center',
          render: (_: any, record: Permission) => (
            <Checkbox
              checked={record.userPermissions.readOnly}
              onChange={() => handlePermissionChange(record, 'readOnly')}
              className="permission-checkbox"
            />
          )
        },
        {
          title: (
            <div className="permission-header">
              <span className="permission-icon">⚙️</span>
              <span>Custom</span>
            </div>
          ),
          key: 'custom',
          width: 120,
          align: 'center',
          render: (_: any, record: Permission) => (
            <Checkbox
              checked={record.userPermissions.custom}
              onChange={() => handlePermissionChange(record, 'custom')}
              className="permission-checkbox"
            />
          )
        }
      ]
    }
  ];

  const handleSave = () => {
    message.success('Permissions saved successfully!');
    console.log('Saving permissions:', permissions);
  };

  const handleCancel = () => {
    if (selectedUser) {
      fetchPermissions(selectedUser);
      message.info('Changes discarded');
    }
  };

  return (
    <div className="permissions-container">
      <div className="permissions-content">
        {/* Header Section */}
        <div className="permissions-header">
          <div className="header-title">
            <SafetyCertificateOutlined className="header-icon" />
            <div>
              <h1>User Permissions Manager</h1>
              <p>Configure access permissions for shared folders and resources</p>
            </div>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchUsers}
            loading={initialLoading}
            size="large"
            type="primary"
            className="refresh-btn"
          >
            Refresh Users
          </Button>
        </div>

        {/* User Selection Card */}
        <Card className="user-selection-card" bordered={false}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div className="selection-header">
              <UserOutlined className="selection-icon" />
              <div>
                <h3>Select User</h3>
                <p>Choose a user to view and manage their permissions</p>
              </div>
            </div>
            
            <Select
              showSearch
              placeholder="🔍 Search and select a user..."
              optionFilterProp="children"
              onChange={handleUserChange}
              value={selectedUser}
              loading={initialLoading}
              size="large"
              className="user-select"
              filterOption={(input, option) =>
                (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
              }
            >
              {users.map(user => (
                <Option key={user.name} value={user.name}>
                  <div className="user-option">
                    <div className="user-option-main">
                      <UserOutlined className="user-avatar" />
                      <div className="user-details">
                        <span className="user-name">{user.name}</span>
                        {user.is_admin && <Tag color="gold">Admin</Tag>}
                      </div>
                    </div>
                    {user.description && (
                      <div className="user-description">{user.description}</div>
                    )}
                  </div>
                </Option>
              ))}
            </Select>

            {selectedUser && (
              <div className="selected-user-info">
                <CheckCircleOutlined className="check-icon" />
                <div>
                  <strong>Selected User:</strong> {selectedUser}
                  {users.find(u => u.name === selectedUser)?.email && (
                    <span className="user-email">
                      {' '}({users.find(u => u.name === selectedUser)?.email})
                    </span>
                  )}
                </div>
              </div>
            )}
          </Space>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert
            message="Error Loading Data"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            className="error-alert"
          />
        )}

        {/* Permissions Table */}
        {selectedUser && (
          <Card className="permissions-table-card" bordered={false}>
            <div className="table-header">
              <div className="table-title">
                <FolderOpenOutlined className="table-icon" />
                <div>
                  <h3>Permissions for {selectedUser}</h3>
                  <p>Manage folder access and permissions</p>
                </div>
              </div>
              <Space size="middle">
                <Button onClick={handleCancel} size="large">
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleSave} 
                  size="large"
                  icon={<CheckCircleOutlined />}
                >
                  Save Changes
                </Button>
              </Space>
            </div>

            <Divider />

            <Alert
              message="Permission Priority"
              description={
                <span>
                  When there is conflict between user and group permission, 
                  the permission is determined by level in the order:{' '}
                  <Tag color="red">NA</Tag> &gt; <Tag color="orange">RW</Tag> &gt; <Tag color="blue">RO</Tag>
                </span>
              }
              type="info"
              showIcon
              className="info-alert"
            />

            <Spin spinning={loading} tip="Loading permissions...">
              <Table
                columns={columns}
                dataSource={permissions}
                rowKey="name"
                pagination={{
                  pageSize: 15,
                  showSizeChanger: true,
                  showTotal: (total) => `Total ${total} items`,
                  pageSizeOptions: ['10', '15', '20', '50']
                }}
                scroll={{ x: 1000 }}
                bordered
                size="middle"
                className="permissions-table"
                rowClassName={(record, index) => 
                  index % 2 === 0 ? 'table-row-even' : 'table-row-odd'
                }
              />
            </Spin>
          </Card>
        )}

        {/* Empty State */}
        {!selectedUser && !initialLoading && (
          <Card className="empty-state" bordered={false}>
            <SafetyCertificateOutlined className="empty-icon" />
            <h3>No User Selected</h3>
            <p>Please select a user from the dropdown above to view and manage their permissions</p>
            <Button type="primary" size="large" disabled>
              Select a User to Continue
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}