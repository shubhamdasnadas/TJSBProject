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
      <body style={{ margin: 0, padding: 0, width: "100%", overflowX: "hidden" }}>
        <ThemeProvider theme={baselightTheme}>
          <CssBaseline />

          <div style={{ width: "100%", margin: 0, padding: 0 }}>
            {isReady && children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
