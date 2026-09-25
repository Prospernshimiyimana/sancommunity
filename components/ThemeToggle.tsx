"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

const STORAGE_KEY = "san-theme";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const headerHost = document.getElementById("theme-toggle-host");
    setHost(headerHost);

    const saved = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);

    setIsDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark, mounted]);

  const toggleTheme = () => {
    setIsDark((current) => !current);
  };

  if (!host) {
    return null;
  }

  return createPortal(
    <button
      type="button"
      className="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      onClick={toggleTheme}
    >
      <span aria-hidden="true">{isDark ? "☀️" : "🌙"}</span>
    </button>,
    host,
  );
}
