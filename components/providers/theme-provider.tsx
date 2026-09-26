"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY, type ResolvedTheme, type ThemePreference } from "@/types/theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

function readInitialPreference(): ThemePreference {
  if (typeof document === "undefined") return "system";
  // The inline head script already wrote this attribute before paint.
  const attr = document.documentElement.getAttribute("data-theme-preference");
  if (attr === "light" || attr === "dark" || attr === "system") return attr;
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readInitialPreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    typeof document === "undefined"
      ? "light"
      : (document.documentElement.getAttribute("data-theme") as ResolvedTheme) || "light",
  );

  const apply = useCallback((next: ThemePreference) => {
    const nextResolved = resolve(next);
    document.documentElement.setAttribute("data-theme", nextResolved);
    document.documentElement.setAttribute("data-theme-preference", next);
    setResolved(nextResolved);
  }, []);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      apply(next);
    },
    [apply],
  );

  // Keep in sync with the OS while the user has chosen "system".
  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference, apply]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
