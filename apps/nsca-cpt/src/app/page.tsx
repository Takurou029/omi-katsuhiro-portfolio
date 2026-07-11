"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";
import { selectQuestions, wrongNoteIds } from "@/lib/leitner";
import { domainProficiency } from "@/lib/stats";
import { displayStreak, toDateKey, answeredOn } from "@/lib/streak";
import { Card, Meter } from "@/components/ui";
import { Heatmap } from "@/components/Heatmap";
import { ProgressionCard } from "@/components/ProgressionCard";
import { Disclaimer } from "@/components/Disclaimer";
import { QuizRunner } from "@/components/QuizRunner";
import {
  FlameIcon,
  PlayIcon,
  CheckCircleIcon,
  BookIcon,
  NoteIcon,
  TargetIcon,
  ArrowRightIcon,
} from "@/components/icons";
import type { Question } from "@/lib/types";

export default function HomePage() {
  const { state, hydrated } = useProgress();
  const [session, setSession] = useState<Question[] | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const todayKey = toDateKey(new Date());
  const streak = displayStreak(state.streak, todayKey);
  const todayCount = answeredOn(state.answers, todayKey);
  const goal = state.settings.dailyGoal;
  const proficiency = useMemo(
    () => domainProficiency(state.answers),
    [state.answers],
  );
  const wrongCount = useMemo(
    () => wrongNoteIds(state.cards).length,
    [state.cards],
  );

  const daysLeft = useMemo(() => {
    if (!state.settings.examDate) return null;
    const exam = new Date(state.settings.examDate + "T00:00:00");
    const today = new Date(todayKey + "T00:00:00");
    return Math.ceil((exam.getTime() - today.getTime()) / 86400000);
  }, [state.settings.examDate, todayKey]);

  const startDaily = () => {
    const qs = selectQuestions(QUESTIONS, state.cards, goal);
    setSession(qs);
    setSessionKey((k) => k + 1);
  };

  if (session) {
    return (
      <QuizRunner
        key={sessionKey}
        questions={session}
        mode="daily"
        title="今日のノルマ"
        onExit={() => setSession(null)}
        onOneMore={startDaily}
      />
    );
  }

  if (!hydrated) {
    return <HomeSkeleton />;
  }

  const goalDone = todayCount >= goal;
  // ストリークが途切れた直後（過去に学習歴があるのに現在0）は励ましの文言に。
  const hadHistory = state.answers.length > 0;
  const streakBroken = streak === 0 && hadHistory;

  return (
    <div className="animate-pop-in px-4 lg:px-8">
      {/* ヒーロー：ストリーク＋今日のノルマ（習慣化の核） */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-lime-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/40">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <FlameIcon
              className={`h-4 w-4 ${streak > 0 ? "text-orange-500" : "text-slate-300 dark:text-slate-600"}`}
            />
            Streak / 連続学習
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span
              className={`counter-number text-7xl font-black leading-none ${
                streak > 0 ? "text-lime-600 dark:text-accent" : "text-slate-300 dark:text-slate-600"
              }`}
            >
              {streak}
            </span>
            <span className="mb-1.5 text-2xl font-black text-slate-400">日</span>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {streakBroken
              ? "今日の1セットで再スタートしましょう。継続は今日から数え直せます。"
              : streak > 0
                ? `この積み重ねを絶やさないように。最長記録は ${state.streak.longest} 日。`
                : "最初の1日を今日にしましょう。"}
          </p>
          <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {daysLeft !== null ? (
              daysLeft >= 0 ? (
                <>
                  本番まであと{" "}
                  <span className="counter-number text-lg font-black text-slate-900 dark:text-white">
                    {daysLeft}
                  </span>{" "}
                  日
                </>
              ) : (
                <span>
                  試験日を過ぎています（
                  <Link href="/settings" className="underline">
                    設定で更新
                  </Link>
                  ）
                </span>
              )
            ) : (
              <>
                試験日は未設定（
                <Link href="/settings" className="underline">
                  設定する
                </Link>
                ）
              </>
            )}
          </p>
        </div>

        {/* 今日のノルマ CTA */}
        <button
          onClick={startDaily}
          className={`group flex flex-col justify-between rounded-2xl p-6 text-left shadow-md transition active:scale-[0.99] ${
            goalDone
              ? "bg-emerald-500 text-white"
              : "bg-accent text-slate-900 hover:bg-accent-soft"
          }`}
        >
          <div className="flex w-full items-start justify-between">
            <div>
              <p className="flex items-center gap-2 text-xl font-black lg:text-2xl">
                {goalDone ? (
                  <>
                    <CheckCircleIcon className="h-6 w-6" />
                    今日のノルマ達成
                  </>
                ) : (
                  <>今日の{goal}問をやる</>
                )}
              </p>
              <p className="mt-1 text-sm font-medium opacity-80">
                {goalDone
                  ? "もう1セット積むと、明日がさらに楽になります"
                  : streakBroken
                    ? "3分で終わります。まずはここから再開"
                    : "ワンタップで開始。まずは最低ノルマだけ"}
              </p>
            </div>
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-black/10 transition group-hover:scale-110">
              <PlayIcon className="h-6 w-6" />
            </span>
          </div>
          <div className="mt-5 flex w-full items-center gap-2 text-xs font-bold opacity-90">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/15">
              <div
                className="h-full rounded-full bg-black/60 transition-[width] duration-500"
                style={{ width: `${Math.min(100, (todayCount / goal) * 100)}%` }}
              />
            </div>
            <span className="tabular-nums">
              {Math.min(todayCount, goal)}/{goal}
            </span>
          </div>
        </button>
      </section>

      {/* 2カラム：積み上げ＋ヒートマップ / 到達度＋アクション */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ProgressionCard answers={state.answers} cards={state.cards} />
          <Card>
            <h2 className="mb-3 text-sm font-bold">学習の記録</h2>
            <Heatmap answers={state.answers} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <TargetIcon className="h-4 w-4 text-accent-strong" />
                分野別 到達度（正答率）
              </h2>
              <Link
                href="/stats"
                className="text-xs font-bold text-lime-700 hover:underline dark:text-accent"
              >
                統計を見る
              </Link>
            </div>
            <div className="space-y-3">
              {proficiency.map((p) => (
                <Meter
                  key={p.domain}
                  value={p.rate}
                  color={p.color}
                  label={p.shortName}
                  rightLabel={
                    p.answered > 0
                      ? `${Math.round(p.rate * 100)}%（${p.answered}問）`
                      : "未挑戦"
                  }
                />
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <ActionLink
              href="/practice"
              icon={<BookIcon className="h-5 w-5" />}
              title="練習モード"
              desc="分野を選んで弱点を潰す"
            />
            <ActionLink
              href="/mock"
              icon={<NoteIcon className="h-5 w-5" />}
              title="模試モード"
              desc="本番形式・制限時間つき"
            />
            <ActionLink
              href="/review"
              icon={<ArrowRightIcon className="h-5 w-5" />}
              title="間違いノート"
              desc={
                wrongCount > 0
                  ? `${wrongCount}問が復習待ち`
                  : "誤答が自動で貯まる"
              }
              highlight={wrongCount > 0}
              className="sm:col-span-2"
            />
          </div>

          <Disclaimer />
          <div className="pb-2 text-center">
            <Link
              href="/about"
              className="text-xs font-medium text-slate-400 underline"
            >
              このアプリについて・免責事項
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ActionLink({
  href,
  icon,
  title,
  desc,
  highlight = false,
  className = "",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:border-accent-strong ${
        highlight
          ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60"
      } ${className}`}
    >
      <span
        className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${
          highlight
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block truncate text-xs text-slate-400">{desc}</span>
      </span>
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 pt-10 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-48 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        <div className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}
