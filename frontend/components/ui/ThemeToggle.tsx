"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * ThemeToggle — Dark mode switch
 * Uses localStorage to persist preference, respects system preference on first visit.
 * Adds/removes 'dark' class on <html> for Tailwind's darkMode: 'class' strategy.
 */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check localStorage first, then system preference
    const stored = localStorage.getItem("transporti_theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
      if (prefersDark) document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem("transporti_theme", newDark ? "dark" : "light");
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Prevent hydration mismatch — don't render until mounted
  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
      title={isDark ? "Mode clair" : "Mode sombre"}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
    >
      {isDark ? (
        <Sun className="w-[18px] h-[18px] transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-[18px] h-[18px] transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
