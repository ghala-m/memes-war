import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("mw_theme");
    const initial: Theme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    window.localStorage.setItem("mw_theme", next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      aria-pressed={theme === "dark"}
      className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-bold"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
