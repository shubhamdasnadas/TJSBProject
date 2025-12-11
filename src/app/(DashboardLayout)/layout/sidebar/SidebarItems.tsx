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
  // RENDER MENU ITEMS WITH FULL PROPER NESTING
  // ============================================
  const renderMenuItems = (items: any, level = 0) => {
    return items.map((item: any) => {
      const Icon = item.icon || IconPoint;

      // Icon wrapper
      const itemIcon = (
        <Box
          sx={{
            display: "flex",
            justifyContent: isSidebarOpen ? "flex-start" : "center",
            alignItems: "center",
            width: isSidebarOpen ? "auto" : "100%",
          }}
        >
          <Icon stroke={1.5} size="1.7rem" />
        </Box>
      );

      // ⭐ Nested Left Padding
      const paddingLeft = isSidebarOpen ? level * 20 + 20 : 0;

      // ============================================
      // SUBMENU (HAS CHILDREN)
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
            {/* ⭐ REAL NESTED CHILDREN WRAPPER */}
            <Box sx={{ marginLeft: isSidebarOpen ? 2 : 0 }}>
              {renderMenuItems(item.children, level + 1)}
            </Box>
          </Submenu>
        );
      }

      // ============================================
      // NORMAL MENU ITEM
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
            height: 36,
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
      {/* ========== LOGO SECTION ========== */}
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
            src="/images/logos/techsec_logo.png"
            style={{ width: "40px" }}
            alt="Logo Icon"
          />
        )}
      </Box>

      {/* ========== FULL NESTED MENU ========== */}
      {renderMenuItems(Menuitems)}
    </MUI_Sidebar>
  );
};

export default SidebarItems;
