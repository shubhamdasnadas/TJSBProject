"use client";

import React, { useState } from "react";
import { Avatar, Box, Menu, Button, IconButton } from "@mui/material";
import { IconMoon, IconSun, IconLogout } from "@tabler/icons-react";
import { useThemeMode } from "@/app/context/ThemeContext";

const Profile = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { mode, toggleMode } = useThemeMode();

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = () => {
    // remove all auth data
    localStorage.removeItem("auth_token");
    localStorage.removeItem("zabbix_auth");
    localStorage.setItem("zabbix_login_status", "false");

    // go to login
    window.location.href = "/authentication/login";
  };

  return (
    <>
      <IconButton size="large" onClick={handleOpenMenu}>
        <Avatar
          src="/images/profile/user-1.jpg"
          alt="Profile"
          sx={{ width: 36, height: 36 }}
        />
      </IconButton>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        {/* <Box
          sx={{
            padding: "10px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Theme: {mode === "light" ? "Light" : "Dark"}
          <IconButton size="small" onClick={toggleMode}>
            {mode === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
          </IconButton>
        </Box> */}

        <Box px={2} pb={2}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<IconLogout />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default Profile;
