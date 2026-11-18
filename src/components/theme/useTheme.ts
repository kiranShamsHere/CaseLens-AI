"use client";

import { useSyncExternalStore } from "react";

const THEME_KEY = "caselens-theme";
const THEME_EVENT = "caselens-theme-change";
type Theme = "light" | "dark";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function currentTheme(): Theme {
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === "dark" || saved === "light" ? saved : systemTheme();
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  const palette = theme === "dark" ? ["#18232d", "#526a7a", "#8299a8"] : ["#e9ece8", "#aab8bf", "#718897"];
  ["--scroll-track", "--scroll-thumb", "--scroll-thumb-hover"].forEach((name, index) => document.documentElement.style.setProperty(name, palette[index]));
}

function notifyThemeChange() { window.dispatchEvent(new Event(THEME_EVENT)); }

function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (!window.localStorage.getItem(THEME_KEY)) {
      applyTheme(systemTheme());
      notifyThemeChange();
    }
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) {
      applyTheme(currentTheme());
      notifyThemeChange();
    }
  };
  media.addEventListener("change", onSystemChange);
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function setTheme(theme: Theme) {
  window.localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  notifyThemeChange();
}

export function useTheme(): readonly [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore<Theme>(subscribe, currentTheme, () => "light");
  return [theme, setTheme] as const;
}
