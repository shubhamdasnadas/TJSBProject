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
import axios from "axios";
import { useRouter } from "next/navigation";

import CustomTextField from "../../(DashboardLayout)/components/forms/theme-elements/CustomTextField";

const AuthLogin = ({
  title,
  subtitle,
  subtext,
  userData,
  setUserData,
}: any) => {
  const router = useRouter();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault(); // 🔥 important for form submit

    try {
      const response = await axios.post("/api/zabbix-login", {
        username: userData.userName,
        password: userData.password,
      });

      const data = response.data;

      if (data.result) {
        localStorage.setItem("zabbix_auth", data.result);
        localStorage.setItem("zabbix_login_status", "true");
        router.push("/");
      } else {
        console.error("Login Failed");
      }
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

      {/* 🔥 FORM START */}
      <form onSubmit={handleSubmit}>
        <Stack>
          {/* Username */}
          <Box>
            <Typography fontWeight={600}>Username</Typography>
            <CustomTextField
              fullWidth
              value={userData.userName}
              onChange={(e: any) =>
                setUserData({ ...userData, userName: e.target.value })
              }
            />
          </Box>

          {/* Password */}
          <Box mt="25px">
            <Typography fontWeight={600}>Password</Typography>
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
          </Stack>
        </Stack>

        {/* 🔥 SUBMIT BUTTON */}
        <Button
          type="submit"      // ⭐ key line
          variant="contained"
          size="large"
          fullWidth
          sx={{ py: 1.6, mb: 2 }}
        >
          Sign In
        </Button>
      </form>
      {/* 🔥 FORM END */}

      {subtitle}
    </>
  );
};

export default AuthLogin;
