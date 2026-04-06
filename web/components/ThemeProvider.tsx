"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ThemeMode = "light" | "dark" | "system";

type Ctx = {
  theme: ThemeMode;
  resolved: "light" | "dark";
  setTheme: (t: ThemeMode) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDomClass(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored = (localStorage.getItem("medos_theme") as ThemeMode | null) ?? "light";
    setThemeState(stored);
    const dark = stored === "dark" || (stored === "system" && systemPrefersDark());
    setResolved(dark ? "dark" : "light");
    applyDomClass(dark);
  }, []);

  // React to OS changes while in "system" mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => {
      setResolved(e.matches ? "dark" : "light");
      applyDomClass(e.matches);
    };
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    localStorage.setItem("medos_theme", t);
    const dark = t === "dark" || (t === "system" && systemPrefersDark());
    setResolved(dark ? "dark" : "light");
    applyDomClass(dark);
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme(): Ctx {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("useTheme must be used inside <ThemeProvider>");
  return v;
}
