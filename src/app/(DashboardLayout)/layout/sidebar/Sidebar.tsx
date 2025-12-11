"use client";

import { Drawer, Box, useMediaQuery, Theme } from "@mui/material";
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
            borderRight: "1px solid #eee",
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
          width: 260,        // ⭐ Force full desktop width on mobile
          boxSizing: "border-box",
        },
      }}
    >
      {/* ⭐ Mobile always shows full expanded menu */}
      <SidebarItems isSidebarOpen={true} />
    </Drawer>
  );
};

export default Sidebar;
