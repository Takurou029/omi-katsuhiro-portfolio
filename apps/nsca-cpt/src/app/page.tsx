"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import { QUESTIONS, getQuestionsByDomain, questionCountByDomain } from "@/lib/questions";
import { selectQuestions, wrongNoteIds } from "@/lib/leitner";
import { DOMAINS } from "@/lib/config";
import { levelFromXp, masteredCount } from "@/lib/progression";
import {
  displayStreak,
  isStreakProtected,
  toDateKey,
  answeredOn,
} from "@/lib/streak";
import { QuizRunner } from "@/components/QuizRunner";
import { FlameIcon, PlayIcon, CheckCircleIcon, ShieldIcon } from "@/components/icons";
import type { Question } from "@/lib/types";

/** 分野をワンタップで始めるときの出題数。 */
const QUICK_START_COUNT = 10;

export default function HomePage() {
  const { state, hydrated, updateSettings } = useProgress();
  const [session, setSession] = useState<Question[] | null>(null);
  const [sessionTitle, setSessionTitle] = useState("今日のノルマ");
  const [sessionMode, setSessionMode] = useState<"daily" | "practice">("daily");
  const [sessionKey, setSessionKey] = useState(0);
  const [restart, setRestart] = useState<(() => void) | null>(null);

  const todayKey = toDateKey(new Date());
  const streak = displayStreak(state.streak, todayKey);
  const todayCount = answeredOn(state.answers, todayKey);
  const goal = state.settings.dailyGoal;
  const counts = useMemo(() => questionCountByDomain(), []);
  const wrongCount = useMemo(
    () => wrongNoteIds(state.cards).length,
    [state.cards],
  );
  const level = levelFromXp(state.answers.length);
  const mastered = masteredCount(state.cards);

  const daysLeft = useMemo(() => {
    if (!state.settings.examDate) return null;
    const exam = new Date(state.settings.examDate + "T00:00:00");
    const today = new Date(todayKey + "T00:00:00");
    return Math.ceil((exam.getTime() - today.getTime()) / 86400000);
  }, [state.settings.examDate, todayKey]);

  /** 今日のノルマを開始する。 */
  const startDaily = () => {
    const run = () => {
      setSession(selectQuestions(QUESTIONS, state.cards, goal));
      setSessionKey((k) => k + 1);
    };
    setSessionTitle("今日のノルマ");
    setSessionMode("daily");
    setRestart(() => run);
    run();
  };

  /** 分野（またはミックス）をワンタップで開始する。 */
  const startDomain = (domainName: string | null, label: string) => {
    const run = () => {
      const pool = domainName ? getQuestionsByDomain(domainName) : QUESTIONS;
      setSession(selectQuestions(pool, state.cards, QUICK_START_COUNT));
      setSessionKey((k) => k + 1);
    };
    setSessionTitle(label);
    setSessionMode("practice");
    setRestart(() => run);
    run();
  };

  if (session) {
    return (
      <QuizRunner
        key={sessionKey}
        questions={session}
        mode={sessionMode}
        title={sessionTitle}
        onExit={() => setSession(null)}
        onOneMore={restart ?? undefined}
      />
    );
  }

  if (!hydrated) return <HomeSkeleton />;

  const goalDone = todayCount >= goal;
  const protectedNow = isStreakProtected(state.streak, todayKey);
  const showReminderNudge =
    state.answers.length > 0 &&
    !state.settings.reminderConfigured &&
    !state.settings.reminderPromptDismissed;

  return (
    <div className="animate-pop-in mx-auto w-full max-w-3xl px-4 lg:px-8">
      {/* 進捗：連続日数・レベル・本番まで を1枚に集約 */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              <FlameIcon
                className={`h-3.5 w-3.5 ${
                  streak > 0
                    ? "text-orange-500"
                    : "text-slate-300 dark:text-slate-600"
                }`}
              />
              連続学習
            </p>
            <p className="mt-0.5 flex items-baseline gap-1.5">
              <span
                className={`counter-number text-5xl font-black leading-none ${
                  streak > 0
                    ? "text-lime-600 dark:text-accent"
                    : "text-slate-300 dark:text-slate-600"
                }`}
              >
                {streak}
              </span>
              <span className="text-lg font-black text-slate-400">日</span>
            </p>
          </div>

          <div className="text-right">
            {daysLeft !== null && daysLeft >= 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                本番まで{" "}
                <span className="counter-number text-2xl font-black text-slate-900 dark:text-white">
                  {daysLeft}
                </span>{" "}
                日
              </p>
            ) : (
              <Link
                href="/settings"
                className="text-sm font-bold text-lime-700 underline dark:text-accent"
              >
                試験日を設定する
              </Link>
            )}
            <p className="mt-1 text-xs text-slate-400">
              累計 {state.answers.length}問 ・ 定着 {mastered}/{QUESTIONS.length}
            </p>
          </div>
        </div>

        {/* レベル進捗 */}
        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-bold">Lv.{level.level}</span>
            <span className="text-slate-400">
              次のレベルまであと {level.remaining} 問
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-accent-strong transition-[width] duration-500"
              style={{ width: `${Math.round(level.progress * 100)}%` }}
            />
          </div>
        </div>

        {protectedNow && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-sky-600 dark:text-sky-400">
            <ShieldIcon className="h-4 w-4 flex-none" />
            昨日はおやすみ保護でつながっています。今日やれば記録は続きます。
          </p>
        )}
      </section>

      {/* 今日のノルマ：最短で学習に入る導線 */}
      <button
        onClick={startDaily}
        className={`mt-4 flex w-full items-center justify-between rounded-2xl px-6 py-5 text-left shadow-md transition active:scale-[0.99] ${
          goalDone
            ? "bg-emerald-500 text-white"
            : "bg-accent text-slate-900 hover:bg-accent-soft"
        }`}
      >
        <span>
          <span className="flex items-center gap-2 text-xl font-black lg:text-2xl">
            {goalDone && <CheckCircleIcon className="h-6 w-6" />}
            {goalDone ? "今日のノルマ達成" : `今日の${goal}問をやる`}
          </span>
          <span className="mt-0.5 block text-sm font-medium opacity-80">
            {goalDone
              ? "もう1セット積むと、明日がさらに楽になります"
              : `約${Math.max(1, goal)}分・苦手な問題から出題されます`}
          </span>
        </span>
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-black/10">
          <PlayIcon className="h-6 w-6" />
        </span>
      </button>

      {/* 今日の進み具合（ノルマ未達のときだけ） */}
      {!goalDone && todayCount > 0 && (
        <div className="mt-2 flex items-center gap-2 px-1 text-xs font-bold text-slate-500">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-accent-strong"
              style={{ width: `${Math.min(100, (todayCount / goal) * 100)}%` }}
            />
          </div>
          <span className="tabular-nums">
            {todayCount}/{goal}
          </span>
        </div>
      )}

      {/* 分野を選んですぐ開始 */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold">
          分野を選んで始める
          <span className="ml-2 font-medium text-slate-400">
            各{QUICK_START_COUNT}問・苦手を優先
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <QuickStart
            label="全分野ミックス"
            count={QUESTIONS.length}
            onClick={() => startDomain(null, "全分野ミックス")}
            className="col-span-2 sm:col-span-3"
          />
          {DOMAINS.map((d) => (
            <QuickStart
              key={d.id}
              label={d.shortName}
              count={counts[d.name] ?? 0}
              color={d.color}
              onClick={() => startDomain(d.name, d.shortName)}
            />
          ))}
          {wrongCount > 0 && (
            <Link
              href="/review"
              className="flex items-center justify-center rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-center text-sm font-bold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
            >
              間違いノート {wrongCount}問
            </Link>
          )}
        </div>
      </section>

      {/* リマインダー提案（1回だけ・1行） */}
      {showReminderNudge && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-200">
          <span className="flex-1">続けるコツは「開くのを忘れないこと」。</span>
          <Link
            href="/settings"
            className="font-bold underline underline-offset-2"
          >
            リマインダーを作る
          </Link>
          <button
            onClick={() => updateSettings({ reminderPromptDismissed: true })}
            className="text-sky-700/70 dark:text-sky-300/70"
          >
            あとで
          </button>
        </div>
      )}

      {/* 詳細メニューは控えめに */}
      <nav className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 border-t border-slate-100 pt-5 text-sm font-bold text-slate-500 dark:border-slate-800">
        <Link href="/practice" className="hover:text-slate-900 dark:hover:text-white">
          練習の詳細設定
        </Link>
        <Link href="/mock" className="hover:text-slate-900 dark:hover:text-white">
          模試モード
        </Link>
        <Link href="/stats" className="hover:text-slate-900 dark:hover:text-white">
          統計・振り返り
        </Link>
      </nav>

      <p className="mb-2 mt-4 text-center text-[11px] leading-relaxed text-slate-400">
        収録問題はオリジナルの学習用です。最終確認は公式テキスト第3版で行ってください。
        <Link href="/about" className="ml-1 underline">
          詳細・免責事項
        </Link>
      </p>
    </div>
  );
}

function QuickStart({
  label,
  count,
  color,
  onClick,
  className = "",
}: {
  label: string;
  count: number;
  color?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center transition hover:border-accent-strong hover:bg-accent/10 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900/60 ${className}`}
    >
      {color && (
        <span
          className="h-2.5 w-2.5 flex-none rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-sm font-bold">{label}</span>
      <span className="text-xs text-slate-400">{count}問</span>
    </button>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl animate-pulse space-y-4 p-4 pt-10 lg:px-8">
      <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
      <div className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800" />
    </div>
  );
}
