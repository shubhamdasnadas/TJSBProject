"use client";

import { useState } from "react"; // ✅ FIXED

import {
  Box,
  AppBar,
  Toolbar,
  Stack,
  IconButton,
  Button,
  useMediaQuery,
} from "@mui/material";
import { Theme } from "@mui/material/styles";
import { IconMenu } from "@tabler/icons-react";
import Link from "next/link";
import Profile from "./Profile";

import { useThemeMode } from "@/app/context/ThemeContext";
import { EncryptedText } from "@/components/ui/encrypted-text";

interface HeaderProps {
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

const Header = ({ toggleSidebar, toggleMobileSidebar }: HeaderProps) => {
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down("lg")
  );
  const { mode } = useThemeMode();

  const [logoAnimTrigger, setLogoAnimTrigger] = useState(0); // ✅ now works

  const loginStatus =
    typeof window !== "undefined"
      ? localStorage.getItem("zabbix_login_status")
      : "false";

  const handleClick = () => {
    setLogoAnimTrigger((v) => v + 1);

    if (isMobile) toggleMobileSidebar();
    else toggleSidebar();
  };

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
      <Toolbar>
        <IconButton onClick={handleClick}>
          <IconMenu width={22} height={22} />
        </IconButton>

        <Box
          sx={{
            ml: 2,
            fontWeight: 700,
            fontSize: "1.25rem",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            "& .text-cyan-500": {
              color: "#06b6d4 !important",
            },
            "& .text-white": {
              color: mode === "dark" ? "#ffffff" : "#014d8c",
            },
          }}
        >
          <EncryptedText
            text="TECHSEC NMS - Cybersecurity Operations"
            encryptedClassName="text-cyan-500"
            revealedClassName="text-white"
            revealDelayMs={30}
          />
        </Box>

        <Box flexGrow={1} />

        {loginStatus !== "true" && (
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
