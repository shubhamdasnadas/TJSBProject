"use client";

import {
  Box,
  AppBar,
  Toolbar,
  styled,
  Stack,
  IconButton,
  Badge,
  Button,
  useMediaQuery,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import { IconBellRinging, IconMenu } from "@tabler/icons-react";
import Link from "next/link";
import Profile from "./Profile";

import { useThemeMode } from "@/app/context/ThemeContext";   // ⭐ ADDED

interface HeaderProps {
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

const Header = ({ toggleSidebar, toggleMobileSidebar }: HeaderProps) => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));
  const { mode } = useThemeMode();      // ⭐ ADDED

  const loginStatus =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_login_status")
      : "false";

  const handleClick = () => {
    if (isMobile) toggleMobileSidebar();
    else toggleSidebar();
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "var(--bg-color)",       // ⭐ THEME APPLIED
        color: "var(--text-color)",          // ⭐ THEME APPLIED
        borderBottom: "1px solid var(--card-border)",
        transition: "background 0.3s ease",
      }}
    >
      <Toolbar>

        <IconButton onClick={handleClick}>
          <IconMenu width={22} height={22} color="var(--text-color)" />  
          {/* ⭐ Icon color from theme */}
        </IconButton>

        <Box flexGrow={1} />

        {loginStatus === "true" ? null : (
          <Stack direction="row" spacing={1} alignItems="center">
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
