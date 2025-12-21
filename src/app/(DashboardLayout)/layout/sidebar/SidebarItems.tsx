"use client";

import React from "react";
import Menuitems from "./MenuItems";
import { Box } from "@mui/material";
import {
  Sidebar as MUI_Sidebar,
  MenuItem,
  Submenu,
} from "react-mui-sidebar";
import { IconPoint } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItemsProps {
  isSidebarOpen: boolean;
}

const SidebarItems = ({ isSidebarOpen }: SidebarItemsProps) => {
  const pathname = usePathname();

  // ============================================
  // RENDER MENU ITEMS (Ant + Tabler SAFE)
  // ============================================
  const renderMenuItems = (items: any[], level = 0) => {
    return items.map((item) => {
      const paddingLeft = isSidebarOpen ? level * 20 + 20 : 0;

      // ============================================
      // ICON HANDLER (BIGGER ICON SIZE)
      // ============================================
      const renderIcon = () => {
        // Default icon
        if (!item.icon) {
          return <IconPoint size={24} />;
        }

        // ✅ Ant Design icon (React element)
        if (React.isValidElement(item.icon)) {
          return React.cloneElement(
            item.icon as React.ReactElement,
            {
              style: {
                fontSize: 24, // ⭐ ANT ICON SIZE
              },
            }
          );
        }

        // ✅ Tabler icon (React component)
        const IconComponent = item.icon;
        return (
          <IconComponent
            size={24}      // ⭐ TABLER ICON SIZE
            stroke={1.8}
          />
        );
      };

      const itemIcon = (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minWidth: 32,              // keeps alignment clean
          }}
        >
          {renderIcon()}
        </Box>
      );

      // ============================================
      // SUBMENU
      // ============================================
      if (item.children) {
        return (
          <Submenu
            key={item.title}
            icon={itemIcon}
            hideExpandIcon={!isSidebarOpen}
            title={isSidebarOpen ? item.title : ""}
            style={{
              paddingLeft,
              marginTop: 3,
              marginBottom: 3,
            }}
          >
            <Box sx={{ marginLeft: isSidebarOpen ? 2 : 0 }}>
              {renderMenuItems(item.children, level + 1)}
            </Box>
          </Submenu>
        );
      }

      // ============================================
      // MENU ITEM
      // ============================================
      return (
        <MenuItem
          key={item.title}
          icon={itemIcon}
          link={item.href}
          component={Link}
          isSelected={pathname === item.href}
          style={{
            display: "flex",
            alignItems: "center",
            paddingLeft,
            height: 40,
          }}
        >
          {isSidebarOpen ? item.title : ""}
        </MenuItem>
      );
    });
  };

  return (
    <MUI_Sidebar
      width={"100%"}
      showProfile={false}
      themeColor={"#014d8c"}
      themeSecondaryColor={"#49beff"}
    >
      {/* ================= LOGO ================= */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "23px 10px",
        }}
      >
        {isSidebarOpen ? (
          <img
            src="/images/logos/image.png"
            style={{ width: "160px" }}
            alt="Logo"
          />
        ) : (
          <img
            src="/images/logos/techsec_logo-removebg-preview.png"
            style={{ width: "40px" }}
            alt="Logo Icon"
          />
        )}
      </Box>

      {/* ================= MENU ================= */}
      {renderMenuItems(Menuitems)}
    </MUI_Sidebar>
  );
};

export default SidebarItems;
