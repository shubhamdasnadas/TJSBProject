"use client";

import { styled, Container, Box, useMediaQuery } from "@mui/material";
import React, { useState } from "react";
import Header from "@/app/(DashboardLayout)/layout/header/Header";
import Sidebar from "@/app/(DashboardLayout)/layout/sidebar/Sidebar";
import { Theme } from "@mui/material/styles";
import { ThemeProvider } from "@/app/context/ThemeContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isDesktop = useMediaQuery((theme: Theme) => theme.breakpoints.up("lg"));
  const sidebarWidth = isDesktop ? (isSidebarOpen ? 255 : 70) : 0;

  const MainWrapper = styled("div")(() => ({
    display: "flex",
    width: "100%",
  }));

  const SidebarWrapper = styled("div")(() => ({
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    width: isDesktop ? sidebarWidth : 0,
    overflowY: "auto",
    background: "var(--sidebar-bg)",
    borderRight: "1px solid #eee",
    zIndex: 1200,
    transition: "width 0.35s ease",
    display: isDesktop ? "block" : "none",
  }));

  const PageWrapper = styled("div")(() => ({
    marginLeft: isDesktop ? sidebarWidth : 0,
    width: isDesktop ? `calc(100% - ${sidebarWidth}px)` : "100%",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    transition: "margin-left 0.35s ease, width 0.35s ease",
  }));

  return (
    <ThemeProvider>
      <MainWrapper>
        <SidebarWrapper>
          <Sidebar
            isSidebarOpen={isSidebarOpen}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        </SidebarWrapper>

        {!isDesktop && (
          <Sidebar
            isSidebarOpen={true}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        )}

        <PageWrapper>
          <Header
            toggleSidebar={() => {
              if (isDesktop) setSidebarOpen(prev => !prev);
              else setMobileSidebarOpen(true);
            }}
            toggleMobileSidebar={() => setMobileSidebarOpen(true)}
          />

          <Container sx={{ paddingTop: "10px" }}>
            <Box sx={{ minHeight: "calc(100vh - 170px)" }}>{children}</Box>
          </Container>
        </PageWrapper>
      </MainWrapper>
    </ThemeProvider>
  );
}
