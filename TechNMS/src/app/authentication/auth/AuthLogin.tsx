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

interface LoginProps {
  title?: string;
  subtitle?: React.ReactNode;
  subtext?: React.ReactNode;

  userData: {
    userName: string;
    password: string;
  };

  setUserData: React.Dispatch<
    React.SetStateAction<{
      userName: string;
      password: string;
    }>
  >;
}

const AuthLogin: React.FC<LoginProps> = ({
  title,
  subtitle,
  subtext,
  userData,
  setUserData,
}) => {
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      const response = await axios.post("/api/zabbix-login", {
        username: userData.userName,
        password: userData.password,
      });

      const data = response.data;

      if (!data?.result) {
        console.error("Login Failed:", data?.error || "Unknown error");
        return;
      }

      const token = data.result;

      // ---------------- TOKEN STORAGE ----------------
      localStorage.setItem("auth_token", token);
      localStorage.setItem("zabbix_auth", token);
      localStorage.setItem("zabbix_login_status", "true");

      // ---------------- PRELOAD TUNNELS ----------------
      try {
        const tunnelRows = await loadTunnels();
        localStorage.setItem(
          "preloaded_tunnels",
          JSON.stringify(tunnelRows)
        );
      } catch (e) {
        console.error("Tunnel preload failed:", e);
        // ❗ dashboard can still load later
      }

      // ---------------- REDIRECT ----------------
      router.replace("/");

    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <>
      {title && (
        <Typography fontWeight="700" variant="h2" mb={1}>
          {title}
        </Typography>
      )}

      {subtext}

      <Stack>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            Username
          </Typography>
          <CustomTextField
            fullWidth
            value={userData.userName}
            onChange={(e: any) =>
              setUserData({ ...userData, userName: e.target.value })
            }
          />
        </Box>

        <Box mt="25px">
          <Typography variant="subtitle1" fontWeight={600}>
            Password
          </Typography>
          <CustomTextField
            type="password"
            fullWidth
            value={userData.password}
            onChange={(e: any) =>
              setUserData({ ...userData, password: e.target.value })
            }
          />
        </Box>

        <Stack direction="row" justifyContent="space-between" my={2}>
          <FormGroup>
            <FormControlLabel
              control={<Checkbox defaultChecked />}
              label="Remember this Device"
            />
          </FormGroup>

          <Typography
            component={Link}
            href="/"
            sx={{ textDecoration: "none", color: "primary.main" }}
          >
            Forgot Password?
          </Typography>
        </Stack>
      </Stack>

      <Button
        fullWidth
        variant="contained"
        size="large"
        sx={{ py: 1.6, mb: 2 }}
        onClick={handleSubmit}
      >
        Sign In
      </Button>

      {subtitle}
    </>
  );
};

export default AuthLogin;
