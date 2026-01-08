"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Mode = "light" | "dark";

interface ThemeContextProps {
  mode: Mode;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  mode: "light",
  toggleMode: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_theme") as Mode;
      if (saved) setMode(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_theme", mode);
    }
  }, [mode]);

  const toggleMode = () => {
    setMode(mode === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeContext);
