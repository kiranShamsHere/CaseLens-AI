"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/useTheme";

export function ThemeToggleButton() {
  const [theme, setTheme] = useTheme();
  const toggle = () => setTheme(theme === "light" ? "dark" : "light");
  return <button type="button" className="site-icon-button" onClick={toggle} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title="Change theme">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button>;
}
