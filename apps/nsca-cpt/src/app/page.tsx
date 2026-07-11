"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import { QUESTIONS } from "@/lib/questions";
import { selectQuestions, wrongNoteIds } from "@/lib/leitner";
import { domainProficiency } from "@/lib/stats";
import {
  displayStreak,
  isStreakProtected,
  toDateKey,
  answeredOn,
} from "@/lib/streak";
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
  ShieldIcon,
} from "@/components/icons";
import type { Question } from "@/lib/types";

export default function HomePage() {
  const { state, hydrated, updateSettings } = useProgress();
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
  // 昨日休んだが保護で繋がっている状態（今日やれば消費してチェーン継続）。
  const protectedNow = isStreakProtected(state.streak, todayKey);
  const firstRun = state.answers.length === 0;
  // リマインダー提案：学習が始まった人にだけ、一度だけ出す。
  const showReminderNudge =
    !firstRun &&
    !state.settings.reminderConfigured &&
    !state.settings.reminderPromptDismissed;

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
            {protectedNow
              ? "昨日はおやすみ保護でつながっています。今日やれば連続記録はそのまま続きます。"
              : streakBroken
                ? "今日の1セットで再スタートしましょう。継続は今日から数え直せます。"
                : streak > 0
                  ? todayCount === 0
                    ? `今日の分を終えると ${streak + 1} 日連続になります。`
                    : goalDone
                      ? "今日の分は完了。いい流れです。"
                      : `あと ${goal - todayCount} 問で今日のノルマ達成です。`
                  : "最初の1日を今日にしましょう。"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            {state.streak.freezes > 0 && (
              <span className="flex items-center gap-1 font-bold text-sky-600 dark:text-sky-400">
                <ShieldIcon className="h-3.5 w-3.5" />
                おやすみ保護 {state.streak.freezes}回分
                {protectedNow && "（今日つなぐと1回分使います）"}
              </span>
            )}
            {state.streak.longest > streak && state.streak.longest >= 2 && (
              <span>最長記録 {state.streak.longest} 日</span>
            )}
          </div>
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

          {/* 開始前の不安を下げる情報チップ（所要時間・復習待ち・今日の進み） */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full bg-black/10 px-3 py-1.5">
              所要 約{Math.max(1, goal)}分
            </span>
            <span className="rounded-full bg-black/10 px-3 py-1.5">
              苦手な問題から自動で出題
            </span>
            {wrongCount > 0 && (
              <span className="rounded-full bg-black/10 px-3 py-1.5">
                復習待ち {wrongCount}問
              </span>
            )}
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

      {/* リマインダー提案（一度だけ）：開くのを忘れない仕組みづくりへ誘導 */}
      {showReminderNudge && (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/30 dark:bg-sky-500/10 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm leading-relaxed text-sky-900 dark:text-sky-200">
            <span className="font-bold">続けるコツは「開くのを忘れないこと」。</span>
            <br className="sm:hidden" />
            毎日決まった時刻に呼び戻してくれるリマインダーを、カレンダーに登録できます。
          </p>
          <div className="flex flex-none gap-2">
            <Link
              href="/settings"
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
            >
              設定でつくる
            </Link>
            <button
              onClick={() =>
                updateSettings({ reminderPromptDismissed: true })
              }
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-sky-700 hover:bg-sky-100 dark:text-sky-300 dark:hover:bg-sky-500/20"
            >
              あとで
            </button>
          </div>
        </div>
      )}

      {/* 2カラム：積み上げ＋ヒートマップ / 到達度＋アクション */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {firstRun ? (
            // 初回はまだ見せるデータがないため、空のグラフの代わりに
            // 「何がどう積み上がるか」を先に伝える。
            <Card>
              <h2 className="text-sm font-bold">このアプリの使い方</h2>
              <ol className="mt-3 space-y-3">
                {[
                  {
                    step: "1",
                    title: "今日の3問をやる（約3分）",
                    desc: "上の緑のボタンから。正解も不正解も、解くだけで積み上がります。",
                  },
                  {
                    step: "2",
                    title: "間違えても大丈夫",
                    desc: "間違えた問題ほど後日くり返し出題され、自然に覚えられます。",
                  },
                  {
                    step: "3",
                    title: "明日もう一度開く",
                    desc: "連続日数・レベル・学習の記録がここに積み上がっていきます。",
                  },
                ].map((s) => (
                  <li key={s.step} className="flex gap-3">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-accent font-black text-slate-900">
                      {s.step}
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{s.title}</span>
                      <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {s.desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <>
              <ProgressionCard answers={state.answers} cards={state.cards} />
              <Card>
                <h2 className="mb-3 text-sm font-bold">学習の記録</h2>
                <Heatmap answers={state.answers} />
              </Card>
            </>
          )}
        </div>

        <div className="space-y-4">
          {!firstRun && (
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
          )}

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
