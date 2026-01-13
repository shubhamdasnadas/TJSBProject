"use client";

import {
  Box,
  AppBar,
  Toolbar,
  Stack,
  Button,
  useMediaQuery,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import { IconMenu4 } from "@tabler/icons-react";
import Link from "next/link";
import Profile from "./Profile";
import { EncryptedText } from "./EncryptedText";
import { useThemeMode } from "@/app/context/ThemeContext";
import { useState, useEffect, useCallback, startTransition } from "react";

interface HeaderProps {
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

const Header = ({ toggleSidebar, toggleMobileSidebar }: HeaderProps) => {
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("lg")
  );
  const { mode } = useThemeMode();
  const [logoAnimTrigger, setLogoAnimTrigger] = useState(0);
  const [loginStatus, setLoginStatus] = useState("false");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLoginStatus(localStorage.getItem("zabbix_login_status") || "false");
    }
  }, []);

  // ✅ TRANSITION-SAFE SIDEBAR TOGGLE (NO REMOUNT)
  const handleToggle = useCallback(() => {
    setLogoAnimTrigger((v) => v + 1);

    startTransition(() => {
      if (isMobile) toggleMobileSidebar();
      else toggleSidebar();
    });
  }, [isMobile, toggleMobileSidebar, toggleSidebar]);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "var(--bg-color)",
        color: "var(--text-color)",
        borderBottom: "1px solid var(--card-border)",
      }}
    >
      <Toolbar component="div">
        {/* ☰ MENU */}
        <Box
          onClick={handleToggle}
          onPointerDown={(e) => e.preventDefault()}
          sx={{
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            borderRadius: 1,
            userSelect: "none",
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.06)",
            },
          }}
        >
          <IconMenu4 width={22} height={22} />
        </Box>

        {/* LOGO */}
        <Box
          sx={{
            ml: 2,
            fontWeight: 700,
            fontSize: "1.25rem",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            "& .encrypted": { color: "#06b6d4" },
            "& .revealed": {
              color: mode === "dark" ? "#ffffff" : "#014d8c",
            },
          }}
        >
          <EncryptedText
            text="TECHSEC NMS - TJSB"
            encryptedClassName="encrypted"
            revealedClassName="revealed"
            revealDelayMs={30}
            trigger={logoAnimTrigger}
          />
        </Box>

        <Box flexGrow={1} />

        {loginStatus !== "true" && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              component={Link}
              href="/authentication/login"
            >
              Login
            </Button>
          </Stack>
        )}

        <Profile />
      </Toolbar>
    </AppBar>
  );
};

export default Header;
