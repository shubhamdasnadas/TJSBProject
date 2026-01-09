"use client";

import React from "react";
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Button,
  Stack,
  Checkbox,
} from "@mui/material";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";

import CustomTextField from "../../(DashboardLayout)/components/forms/theme-elements/CustomTextField";
import { loadTunnels } from "@/utils/loadTunnels";

const AuthLogin = ({ title, subtitle, subtext, userData, setUserData }: any) => {
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      const response = await axios.post("/api/zabbix-login", {
        username: userData.userName,
        password: userData.password,
      });

      if (!response.data?.result) return;

      const token = response.data.result;

      localStorage.setItem("auth_token", token);
      localStorage.setItem("zabbix_auth", token);
      localStorage.setItem("zabbix_login_status", "true");

      router.replace("/");
      // 🔹 preload tunnels
 

      // 🔹 GLOBAL API SUCCESS FLAG (TABLE REFRESH TRIGGER)
      localStorage.setItem("sdwan_api_success", "true");

    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <>
      {title && <Typography variant="h2">{title}</Typography>}
      {subtext}

      <Stack>
        <CustomTextField
          fullWidth
          value={userData.userName}
          onChange={(e: any) =>
            setUserData({ ...userData, userName: e.target.value })
          }
        />

        <CustomTextField
          type="password"
          fullWidth
          value={userData.password}
          onChange={(e: any) =>
            setUserData({ ...userData, password: e.target.value })
          }
        />
      </Stack>

      <Button fullWidth variant="contained" onClick={handleSubmit}>
        Sign In
      </Button>

      {subtitle}
    </>
  );
};

export default AuthLogin;
