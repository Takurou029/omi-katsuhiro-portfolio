"use client";

// Service Worker を登録して PWA（インストール・オフライン）を有効化する。
import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // 開発時の HMR と競合しないよう本番のみ登録する。
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => {
        console.warn("Service Worker の登録に失敗しました。", e);
      });
    };
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
