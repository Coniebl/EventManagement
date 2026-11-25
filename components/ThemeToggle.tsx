"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "cubepass_theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const isDark =
      stored === "dark" ||
      (!stored &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    const timer = window.setTimeout(() => {
      setDark(isDark);
      setMounted(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel-2)] text-[var(--muted)] transition hover:border-[#168bd0]/40 hover:text-[#168bd0]"
    >
      {mounted && dark ? (
        <Sun className="h-3.5 w-3.5 text-[#20c9db]" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
