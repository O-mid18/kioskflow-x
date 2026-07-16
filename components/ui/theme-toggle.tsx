"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("kf-theme");
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (!saved && sys);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("kf-theme", next ? "dark" : "light");
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      title={dark ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln"}
      className="kf-theme-toggle"
      style={{
        position: "fixed",
        right: 24,
        zIndex: 9999,
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "var(--kf-surface)",
        border: "1.5px solid var(--kf-border)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
        cursor: "pointer",
        fontSize: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s, border-color 0.2s",
      }}
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
