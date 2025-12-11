import { chipClasses } from "@mui/material";
import {
  IconAperture,
  IconCopy,
  IconLayoutDashboard,
  IconLogin,
  IconMoodHappy,
  IconTypography,
  IconUserPlus,
} from "@tabler/icons-react";

import { uniqueId } from "lodash";

const Menuitems = [
  { title: "Dashboard", href: "/", icon: IconAperture },

  {
    title: "Monitoring",
    icon: IconAperture,
    children: [
      { title: "Problems", href: "/monitoring/problems" },
      { title: "Hosts", href: "/monitoring/hosts" },
      { title: "Latest Data", href: "/monitoring/latest-data" },
      { title: "Maps", href: "/monitoring/maps" },
      { title: "Discovery", href: "/monitoring/discovery" },
    ],
  },

  {
    title: "Services",
    icon: IconAperture,
    children: [
      { title: "Services", href: "/services/services" },
      { title: "SLA", href: "/services/sla" },
      { title: "SLA Report", href: "/services/sla_report" },
    ],
  },

  {
    title: "Inventory",
    icon: IconAperture,
    children: [
      { title: "Overview", href: "/inventory/overview" },
      { title: "Hosts", href: "/inventory/hosts" },
    ],
  },

  {
    title: "Data Collection",
    icon: IconAperture,
    children: [
      { title: "Template Groups", href: "/data_collection/template_group" },
      { title: "Host Group", href: "/data_collection/host_groups" },
      { title: "Templates", href: "/data_collection/templates" },
      { title: "Hosts", href: "/data_collection/hosts" },
      { title: "Maintenance", href: "/data_collection/maintenance" },
      { title: "Event Correlation", href: "/data_collection/event_correlation" },
      { title: "Discovery", href: "/data_collection/discovery" },
    ],
  },

  {
    title: "Reports",
    icon: IconAperture,
    children: [
      { title: "System Information", href: "/reports/SysInfo" },
      { title: "System Reports", href: "/reports/SysReport" },
      { title: "Availability Reports", href: "/reports/Availability_Reports" },
      { title: "Top 100 Triggers", href: "/reports/Top100_triggers" },
      { title: "Audit Logs", href: "/reports/Audit_logs" },
      { title: "Notifications", href: "/reports/Notification" },
    ],
  },

  {
    title: "Alerts",
    icon: IconAperture,
    children: [
      {
        title: "Actions",
        href: "/alerts/actions",
        children: [
          { title: "Trigger Actions", href: "/alerts/actions/trigger_action" },
          { title: "Service Actions", href: "/alerts/actions/service_action" },
          { title: "Discovery Actions", href: "/alerts/actions/discovery_action" },
          { title: "Autoregistration Actions", href: "/alerts/actions/autoregistration_action" },
          { title: "Internal Actions", href: "/alerts/actions/internal_action" },
        ],
      },
      { title: "Media Types", href: "/alerts/mediatypes" },
      { title: "Script", href: "/alerts/scripts" },
    ],
  },

  {
    title: "Users",
    icon: IconAperture,
    children: [
      { title: "User Groups", href: "/users/UsrGrp" },
      { title: "User Roles", href: "/users/UsrRole" },
      { title: "Users", href: "/users/Users" },
      { title: "API Tokens", href: "/users/ApiToken" },
      { title: "Authentication", href: "/users/Authen" },
    ],
  },

  {
    title: "Administration",
    icon: IconAperture,
    children: [
      {
        title: "General",
        href: "/administration/General",
        children: [
          { title: "GUI", href: "/administration/General/gui" },
          { title: "Autoregistration", href: "/administration/General/autoregistration" },
          { title: "Timeouts", href: "/administration/General/timeout" },
          { title: "Images", href: "/administration/General/images" },
          { title: "Icon Mapping", href: "/administration/General/iconmapping" },
          { title: "Regular Expression", href: "/administration/General/regularepression" },
          { title: "Trigger displaying", href: "/administration/General/regularepression" },
          { title: "Geographical maps", href: "/administration/General/geographical" },
          { title: "Modules", href: "/administration/General/modules" },
          { title: "Connectors", href: "/administration/General/connectors" },
          { title: "Other", href: "/administration/General/other" },
        ],
      },

      { title: "Audit Log", href: "/administration/Audit_log" },
      { title: "Housekeeping", href: "/administration/HouseKeeping" },
      { title: "Proxy Groups", href: "/administration/Proxy_Groups" },
      { title: "Proxies", href: "/administration/Proxies" },
      { title: "Macros", href: "/administration/Macros" },

      {
        title: "Queue",
        href: "/administration/Queue",
        children: [
          { title: "Queue Overview", href: "/administration/Queue/queueoverview" },
          { title: "Queue Overview By Proxy", href: "/administration/Queue/queueoverviewproxy" },
          { title: "Queue Details", href: "/administration/Queue/queuedetails" },
        ],
      },
    ],
  },

];

export default Menuitems;


