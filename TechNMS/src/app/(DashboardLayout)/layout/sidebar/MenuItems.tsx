import {
  DashboardOutlined,
  EyeOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  CloudDownloadOutlined,
  FileTextOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  AlertOutlined,
  DeploymentUnitOutlined,
  ApartmentOutlined,
  AuditOutlined,
  TeamOutlined,
  SafetyOutlined,
  ToolOutlined,
  ClockCircleOutlined,
  KeyOutlined,
} from "@ant-design/icons";

// 👇 CHANGE ROUTE PREFIX HERE ONLY
const PREFIX = "/dash";

const p = (path: string) => `${PREFIX}${path}`;

const Menuitems = [
  {
    title: "Dashboard",
    href: p(""),
    icon: <DashboardOutlined />,
  },

  {
    title: "Monitoring",
    icon: <EyeOutlined />,
    children: [
      { title: "Problems", href: p("/monitoring/problems"), icon: <AlertOutlined /> },
      { title: "Hosts", href: p("/monitoring/hosts"), icon: <DeploymentUnitOutlined /> },
      { title: "Latest Data", href: p("/monitoring/latest-data"), icon: <DatabaseOutlined /> },
      { title: "Maps", href: p("/monitoring/maps"), icon: <ApartmentOutlined /> },
      { title: "Discovery", href: p("/monitoring/discovery"), icon: <CloudDownloadOutlined /> },
    ],
  },

  {
    title: "Services",
    icon: <AppstoreOutlined />,
    children: [
      { title: "Services", href: p("/services/services"), icon: <AppstoreOutlined /> },
      { title: "SLA", href: p("/services/sla"), icon: <ClockCircleOutlined /> },
      { title: "SLA Report", href: p("/services/sla_report"), icon: <FileTextOutlined /> },
    ],
  },

  {
    title: "Inventory",
    icon: <DatabaseOutlined />,
    children: [
      { title: "Overview", href: p("/inventory/overview"), icon: <DashboardOutlined /> },
      { title: "Hosts", href: p("/inventory/hosts"), icon: <DeploymentUnitOutlined /> },
    ],
  },

  {
    title: "Data Collection",
    icon: <CloudDownloadOutlined />,
    children: [
      { title: "Template Groups", href: p("/data_collection/template_group"), icon: <AppstoreOutlined /> },
      { title: "Host Groups", href: p("/data_collection/host_groups"), icon: <TeamOutlined /> },
      { title: "Templates", href: p("/data_collection/templates"), icon: <FileTextOutlined /> },
      { title: "Hosts", href: p("/data_collection/hosts"), icon: <DeploymentUnitOutlined /> },
      { title: "Maintenance", href: p("/data_collection/maintenance"), icon: <ToolOutlined /> },
      { title: "Event Correlation", href: p("/data_collection/event_correlation"), icon: <ApartmentOutlined /> },
      { title: "Discovery", href: p("/data_collection/discovery"), icon: <CloudDownloadOutlined /> },
    ],
  },

  {
    title: "Reports",
    icon: <FileTextOutlined />,
    children: [
      { title: "System Information", href: p("/reports/SysInfo"), icon: <AuditOutlined /> },
      { title: "System Reports", href: p("/reports/SysReport"), icon: <FileTextOutlined /> },
      { title: "Availability Reports", href: p("/reports/Availability_Reports"), icon: <ClockCircleOutlined /> },
      { title: "Top 100 Triggers", href: p("/reports/Top100_triggers"), icon: <AlertOutlined /> },
      { title: "Audit Logs", href: p("/reports/Audit_logs"), icon: <AuditOutlined /> },
      { title: "Notifications", href: p("/reports/Notification"), icon: <BellOutlined /> },
    ],
  },

  {
    title: "Alerts",
    icon: <BellOutlined />,
    children: [
      {
        title: "Actions",
        href: p("/alerts/actions"),
        icon: <ToolOutlined />,
        children: [
          { title: "Trigger Actions", href: p("/alerts/actions/trigger_action") },
          { title: "Service Actions", href: p("/alerts/actions/service_action") },
          { title: "Discovery Actions", href: p("/alerts/actions/discovery_action") },
          { title: "Autoregistration Actions", href: p("/alerts/actions/autoregistration_action") },
          { title: "Internal Actions", href: p("/alerts/actions/internal_action") },
        ],
      },
      { title: "Media Types", href: p("/alerts/mediatypes"), icon: <BellOutlined /> },
      { title: "Script", href: p("/alerts/scripts"), icon: <ToolOutlined /> },
    ],
  },

  {
    title: "Users",
    icon: <UserOutlined />,
    children: [
      { title: "User Groups", href: p("/users/UsrGrp"), icon: <TeamOutlined /> },
      { title: "User Roles", href: p("/users/UsrRole"), icon: <SafetyOutlined /> },
      { title: "Users", href: p("/users/Users"), icon: <UserOutlined /> },
      { title: "API Tokens", href: p("/users/ApiToken"), icon: <KeyOutlined /> },
      { title: "Authentication", href: p("/users/Authen"), icon: <SafetyOutlined /> },
    ],
  },

  {
    title: "Administration",
    icon: <SettingOutlined />,
    children: [
      {
        title: "General",
        href: p("/administration/General"),
        icon: <SettingOutlined />,
        children: [
          { title: "GUI", href: p("/administration/General/gui") },
          { title: "Autoregistration", href: p("/administration/General/autoregistration") },
          { title: "Timeouts", href: p("/administration/General/timeout") },
          { title: "Images", href: p("/administration/General/images") },
          { title: "Icon Mapping", href: p("/administration/General/iconmapping") },
          { title: "Regular Expression", href: p("/administration/General/regularepression") },
          { title: "Trigger displaying", href: p("/administration/General/triggerdisplaying") },
          { title: "Geographical maps", href: p("/administration/General/geographical") },
          { title: "Modules", href: p("/administration/General/modules") },
          { title: "Connectors", href: p("/administration/General/connectors") },
          { title: "Other", href: p("/administration/General/other") },
        ],
      },

      { title: "Audit Log", href: p("/administration/Audit_log"), icon: <AuditOutlined /> },
      { title: "Housekeeping", href: p("/administration/HouseKeeping"), icon: <ClockCircleOutlined /> },
      { title: "Proxy Groups", href: p("/administration/Proxy_Groups"), icon: <TeamOutlined /> },
      { title: "Proxies", href: p("/administration/Proxies"), icon: <DeploymentUnitOutlined /> },
      { title: "Macros", href: p("/administration/Macros"), icon: <ToolOutlined /> },

      {
        title: "Queue",
        href: p("/administration/Queue"),
        icon: <DatabaseOutlined />,
        children: [
          { title: "Queue Overview", href: p("/administration/Queue/queueoverview") },
          { title: "Queue Overview By Proxy", href: p("/administration/Queue/queueoverviewproxy") },
          { title: "Queue Details", href: p("/administration/Queue/queuedetails") },
        ],
      },
    ],
  },

  {
    title: "Availability",
    icon: <FileTextOutlined />,
    children: [
      { title: "Availability Data", href: p("/availability/ava_data"), icon: <AuditOutlined /> },
    ],
  },
];

export default Menuitems;
