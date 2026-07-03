"use client";

// 設定のテーマを <html> の class に反映する。
import { useEffect } from "react";
import { useProgress } from "@/lib/store";

export function ThemeApplier() {
  const { state, hydrated } = useProgress();
  const theme = state.settings.theme;

  useEffect(() => {
    if (!hydrated) return;
    const apply = () => {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      const dark = theme === "dark" || (theme === "system" && prefersDark);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();

    // system の場合は OS 設定の変更にも追従する。
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme, hydrated]);

  return null;
}
