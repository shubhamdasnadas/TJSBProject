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

interface HeaderProps {
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

const Header = ({ toggleSidebar, toggleMobileSidebar }: HeaderProps) => {
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down("lg"));

  const handleClick = () => {
    if (isMobile) toggleMobileSidebar();
    else toggleSidebar();
  };

  return (
    <AppBar position="sticky" color="default" elevation={0}>
      <Toolbar>

        <IconButton onClick={handleClick}>
          <IconMenu width={22} height={22} />
        </IconButton>

        {/* <IconButton color="inherit">
          <Badge variant="dot" color="primary">
            <IconBellRinging size={22} />
          </Badge>
        </IconButton> */}

        <Box flexGrow={1} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" component={Link} href="/authentication/login">
            Login
          </Button>
          <Profile />
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
