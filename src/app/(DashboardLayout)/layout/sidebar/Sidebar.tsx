"use client";

import { Drawer, useMediaQuery, Theme } from "@mui/material";
import SidebarItems from "./SidebarItems";

interface SidebarProps {
  isSidebarOpen: boolean;
  isMobileSidebarOpen: boolean;
  onSidebarClose: () => void;
}

const Sidebar = ({
  isSidebarOpen,
  isMobileSidebarOpen,
  onSidebarClose,
}: SidebarProps) => {
  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));
  const sidebarWidth = isSidebarOpen ? 260 : 70;

  // ==========================
  // DESKTOP SIDEBAR
  // ==========================
  if (lgUp) {
    return (
      <Drawer
        variant="persistent"
        open={true}
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: sidebarWidth,
            boxSizing: "border-box",

            /* ⭐ Theme Variables */
            background: "var(--sidebar-bg)",
            color: "var(--sidebar-text)",
            borderRight: "1px solid var(--border-color)",

            transition: "background 0.3s ease, color 0.3s ease",
          },
        }}
      >
        <SidebarItems isSidebarOpen={isSidebarOpen} />
      </Drawer>
    );
  }

  // ==========================
  // MOBILE SIDEBAR
  // ==========================
  return (
    <Drawer
      anchor="left"
      variant="temporary"
      open={isMobileSidebarOpen}
      onClose={onSidebarClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        "& .MuiDrawer-paper": {
          width: 260,

          /* ⭐ Theme Variables */
          background: "var(--sidebar-bg)",
          color: "var(--sidebar-text)",

          transition: "background 0.3s ease, color 0.3s ease",
        },
      }}
    >
      <SidebarItems isSidebarOpen={true} />
    </Drawer>
  );
};

export default Sidebar;
