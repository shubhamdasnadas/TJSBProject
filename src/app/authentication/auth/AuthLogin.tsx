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
    console.log("Login submitted:", userData);

    try {
      const response = await axios.post(
        "http://192.168.56.1:3000/api/zabbix-login",
        {
          username: userData.userName,
          password: userData.password,
        }
      );

      const data = response.data;

      if (data.result) {
        const token = data.result;
        console.log("User Token:", token);

        localStorage.setItem("zabbix_auth", token);

        router.push("/");
      } else {
        console.error("Login Failed:", data.error || "Unknown error");
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

      <Stack>
        {/* Username */}
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="username"
            mb="5px"
          >
            Username
          </Typography>
          <CustomTextField
            id="username"
            variant="outlined"
            fullWidth
            value={userData.userName}
            onChange={(e:any) =>
              setUserData({ ...userData, userName: e.target.value })
            }
          />
        </Box>

        {/* Password */}
        <Box mt="25px">
          <Typography
            variant="subtitle1"
            fontWeight={600}
            component="label"
            htmlFor="password"
            mb="5px"
          >
            Password
          </Typography>
          <CustomTextField
            id="password"
            type="password"
            variant="outlined"
            fullWidth
            value={userData.password}
            onChange={(e:any) =>
              setUserData({ ...userData, password: e.target.value })
            }
          />
        </Box>

        {/* Remember + Forgot */}
        <Stack
          justifyContent="space-between"
          direction="row"
          alignItems="center"
          my={2}
        >
          <FormGroup>
            <FormControlLabel
              control={<Checkbox defaultChecked />}
              label="Remember this Device"
            />
          </FormGroup>

          <Typography
            component={Link}
            href="/"
            fontWeight="500"
            sx={{ textDecoration: "none", color: "primary.main" }}
          >
            Forgot Password?
          </Typography>
        </Stack>
      </Stack>

      {/* Login Button */}
      <Box>
        <Button
          color="primary"
          variant="contained"
          size="large"
          fullWidth
          sx={{ py: 1.6, mb: 2 }}
          onClick={handleSubmit}
        >
          Sign In
        </Button>
      </Box>

      {subtitle}
    </>
  );
};

export default AuthLogin;
