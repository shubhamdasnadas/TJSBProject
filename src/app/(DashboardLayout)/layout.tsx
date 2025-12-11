"use client";

import { styled, Container, Box, useMediaQuery } from "@mui/material";
import React, { useState } from "react";
import Header from "@/app/(DashboardLayout)/layout/header/Header";
import Sidebar from "@/app/(DashboardLayout)/layout/sidebar/Sidebar";
import { Theme } from "@mui/material/styles";

export default function RootLayout({ children }: { children: React.ReactNode }) {

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));

  // ⭐ Desktop sidebar width — mobile always full overlay
  const sidebarWidth = isDesktop ? (isSidebarOpen ? 255 : 70) : 0;

  const MainWrapper = styled("div")(() => ({
    display: "flex",
    width: "100%",
  }));

  // ⭐ FIXED SIDEBAR (desktop only)
  const SidebarWrapper = styled("div")(() => ({
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    width: isDesktop ? sidebarWidth : 0,  // ⭐ don't push on mobile
    overflowY: "auto",
    background: "#fff",
    borderRight: "1px solid #eee",
    zIndex: 1200,
    transition: "width 0.35s ease",
    display: isDesktop ? "block" : "none",  // ⭐ hide wrapper on mobile
  }));

  // ⭐ Page content shifts ONLY on desktop
  const PageWrapper = styled("div")(() => ({
    marginLeft: isDesktop ? sidebarWidth : 0,
    width: isDesktop ? `calc(100% - ${sidebarWidth}px)` : "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    transition: "margin-left 0.35s ease, width 0.35s ease",
  }));

  return (
    <MainWrapper>

      {/* ⭐ DESKTOP SIDEBAR */}
      <SidebarWrapper>
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onSidebarClose={() => setMobileSidebarOpen(false)}
        />
      </SidebarWrapper>

      {/* ⭐ MOBILE SIDEBAR (overlay) */}
      {!isDesktop && (
        <Sidebar
          isSidebarOpen={true}               // mobile always full sidebar
          isMobileSidebarOpen={isMobileSidebarOpen}
          onSidebarClose={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ⭐ PAGE CONTENT */}
      <PageWrapper>
        <Header
          toggleSidebar={() => {
            if (isDesktop) setSidebarOpen(prev => !prev);
            else setMobileSidebarOpen(true);
          }}
          toggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <Container sx={{ paddingTop: "10px" }}>
          <Box sx={{ minHeight: "calc(100vh - 170px)" }}>
            {children}
          </Box>
        </Container>
      </PageWrapper>

    </MainWrapper>
  );
}
