"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

import { baselightTheme } from "@/utils/theme/DefaultColors";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "./global.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("auth_token")
        : null;

    // NOT LOGGED IN → go to login
    if (
      !token &&
      pathname !== "/authentication/login" &&
      pathname !== "/authentication/register"
    ) {
      router.replace("/authentication/login");
      return;
    }

    // LOGGED IN → block returning to login
    if (token && pathname === "/authentication/login") {
      router.replace("/");
      return;
    }

    setIsReady(true);
  }, [pathname, router]);

  return (
    <html lang="en">
      <body>
        <ThemeProvider theme={baselightTheme}>
          <CssBaseline />

          {/* Show nothing until auth check is done */}
          {isReady && children}
        </ThemeProvider>
      </body>
    </html>
  );
}
