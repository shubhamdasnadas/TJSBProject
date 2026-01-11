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
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  // ✅ ENTER KEY HANDLER
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      <Stack spacing={3}>
        {/* USERNAME */}
        <Box>
          <Typography fontWeight={600} mb={0.5} color="#cbd5f5">
            Username
          </Typography>
          <CustomTextField
            fullWidth
            value={userData.userName}
            onChange={(e: any) =>
              setUserData({ ...userData, userName: e.target.value })
            }
            onKeyDown={handleKeyDown} // ✅ ENTER
            sx={{
              backgroundColor: "#94a3b8",
              borderRadius: 1,
            }}
          />
        </Box>

        {/* PASSWORD */}
        <Box>
          <Typography fontWeight={600} mb={0.5} color="#cbd5f5">
            Password
          </Typography>
          <CustomTextField
            type="password"
            fullWidth
            value={userData.password}
            onChange={(e: any) =>
              setUserData({ ...userData, password: e.target.value })
            }
            onKeyDown={handleKeyDown} // ✅ ENTER
            sx={{
              backgroundColor: "#94a3b8",
              borderRadius: 1,
            }}
          />
        </Box>

        {/* REMEMBER */}
        <FormGroup>
          <FormControlLabel
            control={<Checkbox defaultChecked />}
            label={
              <Typography fontSize={14} color="#cbd5f5">
                Remember this device
              </Typography>
            }
          />
        </FormGroup>

        {/* BUTTON */}
        <Button
          fullWidth
          size="large"
          variant="contained"
          sx={{
            py: 1.6,
            background: "linear-gradient(90deg,#3b82f6,#2563eb)",
            fontWeight: 600,
          }}
          onClick={handleSubmit}
        >
          Sign In
        </Button>

        {subtitle}
      </Stack>
    </>
  );
};

export default AuthLogin;
