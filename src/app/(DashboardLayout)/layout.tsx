"use client";

import React, { useState } from "react";
import { styled, Container, Box, useMediaQuery } from "@mui/material";
import { Theme } from "@mui/material/styles";
import Header from "@/app/(DashboardLayout)/layout/header/Header";
import Sidebar from "@/app/(DashboardLayout)/layout/sidebar/Sidebar";
import { ThemeProvider } from "@/app/context/ThemeContext";

/* =========================
   STYLED COMPONENTS (OUTSIDE)
========================= */
const MainWrapper = styled("div")({
  display: "flex",
  width: "100%",
});

const SidebarWrapper = styled("div")({
  position: "fixed",
  top: 0,
  left: 0,
  height: "100vh",
  overflowY: "auto",
  background: "var(--sidebar-bg)",
  borderRight: "1px solid #eee",
  zIndex: 1200,
  transition: "width 0.35s ease",
});

const PageWrapper = styled("div")({
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  transition: "margin-left 0.35s ease, width 0.35s ease",
});

/* =========================
   LAYOUT
========================= */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isDesktop = useMediaQuery((theme: Theme) =>
    theme.breakpoints.up("lg")
  );

  const sidebarWidth = isDesktop ? (isSidebarOpen ? 255 : 70) : 0;

  return (
    <ThemeProvider>
      <MainWrapper>
        <SidebarWrapper style={{ width: sidebarWidth }}>
          <Sidebar
            isSidebarOpen={isDesktop ? isSidebarOpen : true}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onSidebarClose={() => setMobileSidebarOpen(false)}
          />
        </SidebarWrapper>

        <PageWrapper
          style={{
            marginLeft: sidebarWidth,
            width: `calc(100% - ${sidebarWidth}px)`,
          }}
        >
          <Header
            toggleSidebar={() => {
              if (isDesktop) setSidebarOpen((p) => !p);
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
    </ThemeProvider>
  );
}
