"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";
import { selectQuestions } from "@/lib/leitner";
import { domainProficiency } from "@/lib/stats";
import { dailyCounts, displayStreak, toDateKey, answeredOn } from "@/lib/streak";
import { Card, Meter, StatTile } from "@/components/ui";
import { WeekChart } from "@/components/WeekChart";
import { Disclaimer } from "@/components/Disclaimer";
import { QuizRunner } from "@/components/QuizRunner";
import type { Question } from "@/lib/types";

export default function HomePage() {
  const { state, hydrated } = useProgress();
  const [session, setSession] = useState<Question[] | null>(null);

  const todayKey = toDateKey(new Date());
  const streak = displayStreak(state.streak, todayKey);
  const totalAnswers = state.answers.length;
  const todayCount = answeredOn(state.answers, todayKey);
  const goal = state.settings.dailyGoal;
  const week = useMemo(() => dailyCounts(state.answers, 7), [state.answers]);
  const proficiency = useMemo(
    () => domainProficiency(state.answers),
    [state.answers],
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
  };

  if (session) {
    return (
      <QuizRunner
        questions={session}
        mode="daily"
        title="今日のノルマ"
        onExit={() => setSession(null)}
      />
    );
  }

  if (!hydrated) {
    return <HomeSkeleton />;
  }

  const goalDone = todayCount >= goal;

  return (
    <div className="animate-pop-in">
      {/* ストリーク：スコアボード風に大きく */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 px-4 pb-6 pt-8 text-white dark:from-black dark:to-slate-900">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">
          Streak / 連続学習
        </p>
        <div className="mt-1 flex items-end gap-3">
          <span className="counter-number text-7xl font-black leading-none text-accent">
            {streak}
          </span>
          <span className="mb-2 text-2xl font-black text-slate-300">日</span>
          {streak > 0 && <span className="mb-2 text-3xl">🔥</span>}
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {daysLeft !== null ? (
            daysLeft >= 0 ? (
              <>
                本番まであと{" "}
                <span className="font-black text-white">{daysLeft}</span> 日
              </>
            ) : (
              <span className="text-white">試験日を過ぎています（設定で更新）</span>
            )
          ) : (
            <>
              試験日は未設定です（
              <Link href="/settings" className="underline">
                設定
              </Link>
              ）
            </>
          )}
        </p>
      </section>

      <div className="space-y-4 px-4 pt-4">
        {/* 今日の3問 導線（習慣化の核） */}
        <button
          onClick={startDaily}
          className={`w-full rounded-2xl px-5 py-5 text-left shadow-lg transition active:scale-[0.99] ${
            goalDone
              ? "bg-emerald-500 text-white"
              : "bg-accent text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-black">
                {goalDone ? "今日のノルマ達成 ✅" : `今日の${goal}問をやる`}
              </p>
              <p className="text-sm font-medium opacity-80">
                {goalDone
                  ? "もう1セットで差をつける"
                  : "ワンタップで開始・習慣化の第一歩"}
              </p>
            </div>
            <span className="text-3xl">▶</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-bold opacity-90">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-black/70"
                style={{
                  width: `${Math.min(100, (todayCount / goal) * 100)}%`,
                }}
              />
            </div>
            <span className="tabular-nums">
              {Math.min(todayCount, goal)}/{goal}
            </span>
          </div>
        </button>

        {/* 集計タイル */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatTile value={totalAnswers} label="累計解答" />
          <StatTile value={state.streak.longest} label="最長ストリーク" />
          <StatTile value={todayCount} label="今日の解答" />
        </div>

        {/* 直近7日グラフ */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">直近7日の学習</h2>
            <Link
              href="/stats"
              className="text-xs font-bold text-accent-strong dark:text-accent"
            >
              統計を見る →
            </Link>
          </div>
          <WeekChart data={week} />
        </Card>

        {/* 分野別到達度メーター */}
        <Card>
          <h2 className="mb-3 text-sm font-bold">分野別 到達度（正答率）</h2>
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

        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/practice"
            className="rounded-2xl bg-slate-100 p-4 text-center font-bold dark:bg-slate-800/70"
          >
            📚 練習モード
          </Link>
          <Link
            href="/mock"
            className="rounded-2xl bg-slate-100 p-4 text-center font-bold dark:bg-slate-800/70"
          >
            📝 模試モード
          </Link>
        </div>

        <Link
          href="/review"
          className="flex items-center justify-between rounded-2xl bg-slate-100 p-4 font-bold dark:bg-slate-800/70"
        >
          <span>📕 間違いノートで復習</span>
          <span className="text-slate-400">→</span>
        </Link>

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
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 pt-10">
      <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}
