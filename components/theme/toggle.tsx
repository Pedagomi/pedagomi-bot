"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button size="icon" variant="ghost" aria-label="Theme" disabled><Sun /></Button>;
  }

  const isDark = theme === "dark";
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={isDark ? "Passer en mode jour" : "Passer en mode nuit"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
