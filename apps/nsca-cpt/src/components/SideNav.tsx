"use client";

// PC（lg以上）用の左サイドバー。モバイルでは BottomNav を使う。
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useProgress } from "@/lib/store";
import { displayStreak, toDateKey } from "@/lib/streak";
import { FlameIcon } from "./icons";

const ITEMS = [
  { href: "/", label: "ホーム" },
  { href: "/practice", label: "練習モード" },
  { href: "/mock", label: "模試モード" },
  { href: "/review", label: "間違いノート" },
  { href: "/stats", label: "統計・振り返り" },
  { href: "/settings", label: "設定" },
];

export function SideNav() {
  const pathname = usePathname();
  const { state, hydrated } = useProgress();
  const normalize = (p: string) =>
    p !== "/" && p.endsWith("/") ? p.slice(0, -1) : p;
  const current = normalize(pathname ?? "/");

  const todayKey = toDateKey(new Date());
  const streak = displayStreak(state.streak, todayKey);
  const daysLeft = useMemo(() => {
    if (!state.settings.examDate) return null;
    const exam = new Date(state.settings.examDate + "T00:00:00");
    const today = new Date(todayKey + "T00:00:00");
    return Math.ceil((exam.getTime() - today.getTime()) / 86400000);
  }, [state.settings.examDate, todayKey]);

  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-60 flex-none flex-col border-r border-slate-200 bg-slate-50/60 px-4 py-6 dark:border-slate-800 dark:bg-slate-900/40 lg:flex">
      <Link href="/" className="px-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent-strong">
          NSCA-CPT
        </p>
        <p className="mt-0.5 text-lg font-black leading-tight">試験対策</p>
      </Link>

      <nav aria-label="メインナビゲーション" className="mt-8 flex-1">
        <ul className="space-y-1">
          {ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? current === "/"
                : current.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                    active
                      ? "bg-accent text-slate-900"
                      : "text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {hydrated && (
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center gap-1.5 font-bold">
            <FlameIcon
              className={`h-4 w-4 ${streak > 0 ? "text-orange-500" : "text-slate-300 dark:text-slate-600"}`}
            />
            連続 {streak} 日
          </p>
          {daysLeft !== null && daysLeft >= 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              本番まで{" "}
              <span className="font-black text-slate-900 dark:text-white">
                {daysLeft}
              </span>{" "}
              日
            </p>
          ) : (
            <Link
              href="/settings"
              className="block text-xs font-bold text-lime-700 underline dark:text-accent"
            >
              試験日を設定する
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}
