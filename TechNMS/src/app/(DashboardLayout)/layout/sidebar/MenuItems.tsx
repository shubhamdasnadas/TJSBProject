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
  KeyOutlined,          // ✅ FIXED: MISSING IMPORT
} from "@ant-design/icons";
import { title } from "process";

const Menuitems = [
  
  {
    title: "Dashboard",
    href: "/",
    icon: <DashboardOutlined />,
  },

  {
    title: "Monitoring",
    icon: <EyeOutlined />,
    children: [
      { title: "Problems", href: "/monitoring/problems", icon: <AlertOutlined /> },
      { title: "Hosts", href: "/monitoring/hosts", icon: <DeploymentUnitOutlined /> },
      { title: "Latest Data", href: "/monitoring/latest-data", icon: <DatabaseOutlined /> },
      // { title: "Maps", href: "/monitoring/maps", icon: <ApartmentOutlined /> },
      // { title: "Discovery", href: "/monitoring/discovery", icon: <CloudDownloadOutlined /> },
    ],
  },

  // {
  //   title: "Services",
  //   icon: <AppstoreOutlined />,
  //   children: [
  //     { title: "Services", href: "/services/services", icon: <AppstoreOutlined /> },
  //     { title: "SLA", href: "/services/sla", icon: <ClockCircleOutlined /> },
  //     { title: "SLA Report", href: "/services/sla_report", icon: <FileTextOutlined /> },
  //   ],
  // },

  {
    title: "Inventory",
    href: "/inventory",
    icon: <DatabaseOutlined />,
    // children: [
    //   { title: "Overview", href: "/inventory/overview", icon: <DashboardOutlined /> },
    //   { title: "Hosts", href: "/inventory/hosts", icon: <DeploymentUnitOutlined /> },
    // ],
  },

  // {
  //   title: "Data Collection",
  //   icon: <CloudDownloadOutlined />,
  //   children: [
  //     { title: "Template Groups", href: "/data_collection/template_group", icon: <AppstoreOutlined /> },
  //     { title: "Host Groups", href: "/data_collection/host_groups", icon: <TeamOutlined /> },
  //     { title: "Templates", href: "/data_collection/templates", icon: <FileTextOutlined /> },
  //     { title: "Hosts", href: "/data_collection/hosts", icon: <DeploymentUnitOutlined /> },
  //     { title: "Maintenance", href: "/data_collection/maintenance", icon: <ToolOutlined /> },
  //     { title: "Event Correlation", href: "/data_collection/event_correlation", icon: <ApartmentOutlined /> },
  //     { title: "Discovery", href: "/data_collection/discovery", icon: <CloudDownloadOutlined /> },
  //   ],
  // },

  {
    title: "Reports",
    icon: <FileTextOutlined />,
    children: [
      // { title: "System Information", href: "/reports/SysInfo", icon: <AuditOutlined /> },
      { title: "System Reports", href: "/reports/SysReport", icon: <FileTextOutlined /> },
      // { title: "Availability Reports", href: "/reports/Availability_Reports", icon: <ClockCircleOutlined /> },
      { title: "Top 100 Triggers", href: "/reports/Top100_triggers", icon: <AlertOutlined /> },
      // { title: "Audit Logs", href: "/reports/Audit_logs", icon: <AuditOutlined /> },
      // { title: "Notifications", href: "/reports/Notification", icon: <BellOutlined /> },
    ],
  },

  // {
  //   title: "Alerts",
  //   icon: <BellOutlined />,
  //   children: [
  //     {
  //       title: "Actions",
  //       href: "/alerts/actions",
  //       icon: <ToolOutlined />,
  //       children: [
  //         { title: "Trigger Actions", href: "/alerts/actions/trigger_action" },
  //         { title: "Service Actions", href: "/alerts/actions/service_action" },
  //         { title: "Discovery Actions", href: "/alerts/actions/discovery_action" },
  //         { title: "Autoregistration Actions", href: "/alerts/actions/autoregistration_action" },
  //         { title: "Internal Actions", href: "/alerts/actions/internal_action" },
  //       ],
  //     },
  //     { title: "Media Types", href: "/alerts/mediatypes", icon: <BellOutlined /> },
  //     { title: "Script", href: "/alerts/scripts", icon: <ToolOutlined /> },
  //   ],
  // },

  // {
  //   title: "Users",
  //   icon: <UserOutlined />,
  //   children: [
  //     { title: "User Groups", href: "/users/UsrGrp", icon: <TeamOutlined /> },
  //     { title: "User Roles", href: "/users/UsrRole", icon: <SafetyOutlined /> },
  //     { title: "Users", href: "/users/Users", icon: <UserOutlined /> },
  //     { title: "API Tokens", href: "/users/ApiToken", icon: <KeyOutlined /> }, // ✅ NOW SAFE
  //     { title: "Authentication", href: "/users/Authen", icon: <SafetyOutlined /> },
  //   ],
  // },

  // {
  //   title: "Administration",
  //   icon: <SettingOutlined />,
  //   children: [
  //     {
  //       title: "General",
  //       href: "/administration/General",
  //       icon: <SettingOutlined />,
  //       children: [
  //         { title: "GUI", href: "/administration/General/gui" },
  //         { title: "Autoregistration", href: "/administration/General/autoregistration" },
  //         { title: "Timeouts", href: "/administration/General/timeout" },
  //         { title: "Images", href: "/administration/General/images" },
  //         { title: "Icon Mapping", href: "/administration/General/iconmapping" },
  //         { title: "Regular Expression", href: "/administration/General/regularepression" },
  //         { title: "Trigger displaying", href: "/administration/General/triggerdisplaying" },
  //         { title: "Geographical maps", href: "/administration/General/geographical" },
  //         { title: "Modules", href: "/administration/General/modules" },
  //         { title: "Connectors", href: "/administration/General/connectors" },
  //         { title: "Other", href: "/administration/General/other" },
  //       ],
  //     },

  //     { title: "Audit Log", href: "/administration/Audit_log", icon: <AuditOutlined /> },
  //     { title: "Housekeeping", href: "/administration/HouseKeeping", icon: <ClockCircleOutlined /> },
  //     { title: "Proxy Groups", href: "/administration/Proxy_Groups", icon: <TeamOutlined /> },
  //     { title: "Proxies", href: "/administration/Proxies", icon: <DeploymentUnitOutlined /> },
  //     { title: "Macros", href: "/administration/Macros", icon: <ToolOutlined /> },

  //     {
  //       title: "Queue",
  //       href: "/administration/Queue",
  //       icon: <DatabaseOutlined />,
  //       children: [
  //         { title: "Queue Overview", href: "/administration/Queue/queueoverview" },
  //         { title: "Queue Overview By Proxy", href: "/administration/Queue/queueoverviewproxy" },
  //         { title: "Queue Details", href: "/administration/Queue/queuedetails" },
  //       ],
  //     },

  //   ],
  // },
  {
    title: "Availability",
    icon: <FileTextOutlined />,
    children: [
      { title: "Availability Data", href: "/availability/ava_data", icon: <AuditOutlined /> },
    ],
  },
];

export default Menuitems;
