// src/lib/theme.ts
export type AppTheme = "light" | "dark";

const STORAGE_KEY = "app-theme";

export function applyTheme(next: AppTheme) {
  document.body.classList.toggle("dark", next === "dark");
  localStorage.setItem(STORAGE_KEY, next);
}

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
    return saved;
  }
  // default: seguir el sistema la primera vez
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const initial: AppTheme = prefersDark ? "dark" : "light";
  applyTheme(initial);
  return initial;
}
