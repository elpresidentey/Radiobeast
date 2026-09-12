"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: "dark",
  toggle: () => {},
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("radiobeast:theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = saved || (prefersDark ? "dark" : "dark"); // default dark to match existing UX
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount hydration from localStorage
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("radiobeast:theme")) {
        const t: Theme = e.matches ? "dark" : "light";
        setThemeState(t);
        document.documentElement.setAttribute("data-theme", t);
      }
    };
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("radiobeast:theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  // avoid flash: render children immediately but theme is applied via script + effect
  return <ThemeCtx.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeCtx.Provider>;
}
