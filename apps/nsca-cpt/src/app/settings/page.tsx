"use client";

import { useState } from "react";
import { useProgress } from "@/lib/store";
import { PageHeader, Card } from "@/components/ui";
import type { ThemePreference } from "@/lib/types";

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "端末に従う" },
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
];

export default function SettingsPage() {
  const { state, updateSettings, resetAll, hydrated } = useProgress();
  const [confirming, setConfirming] = useState(false);

  if (!hydrated) {
    return (
      <div className="p-4 pt-10">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="animate-pop-in">
      <PageHeader title="設定" subtitle="試験日・ノルマ・表示テーマを変更できます。" />
      <div className="space-y-4 px-4">
        <Card>
          <label htmlFor="examDate" className="block text-sm font-bold">
            試験日（本番まであと◯日に反映）
          </label>
          <input
            id="examDate"
            type="date"
            value={state.settings.examDate ?? ""}
            onChange={(e) =>
              updateSettings({ examDate: e.target.value || null })
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="mt-2 text-xs text-slate-400">
            試験日は設定値です。最新の公式情報でご確認ください。
          </p>
        </Card>

        <Card>
          <label htmlFor="dailyGoal" className="block text-sm font-bold">
            1日のノルマ（今日の◯問）
          </label>
          <div className="mt-2 flex items-center gap-2">
            {[3, 5, 10].map((g) => (
              <button
                key={g}
                onClick={() => updateSettings({ dailyGoal: g })}
                aria-pressed={state.settings.dailyGoal === g}
                className={`flex-1 rounded-xl py-3 font-black tabular-nums transition ${
                  state.settings.dailyGoal === g
                    ? "bg-accent text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {g}問
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-bold">表示テーマ</p>
          <div className="mt-2 flex items-center gap-2">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => updateSettings({ theme: t.value })}
                aria-pressed={state.settings.theme === t.value}
                className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${
                  state.settings.theme === t.value
                    ? "bg-accent text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
            データのリセット
          </p>
          <p className="mt-1 text-xs text-slate-400">
            解答履歴・ストリーク・設定をすべて消去します。取り消せません。
          </p>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="mt-3 w-full rounded-xl border-2 border-rose-400 py-3 font-bold text-rose-600 dark:text-rose-400"
            >
              学習データを消去する
            </button>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-xl bg-slate-100 py-3 font-bold dark:bg-slate-800"
              >
                やめる
              </button>
              <button
                onClick={() => {
                  resetAll();
                  setConfirming(false);
                }}
                className="flex-1 rounded-xl bg-rose-500 py-3 font-bold text-white"
              >
                本当に消去する
              </button>
            </div>
          )}
        </Card>

        <p className="pb-2 text-center text-[11px] text-slate-400">
          データはこの端末のブラウザ（localStorage）にのみ保存されます。
        </p>
      </div>
    </div>
  );
}
