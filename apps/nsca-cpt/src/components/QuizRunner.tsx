"use client";

// 練習／今日の3問／間違いノート／模試 で共通利用する出題ランナー。
// - feedback モード（practice/daily/review）：解答直後に正誤＋解説（＋図解）を表示
// - mock モード：即時解説なし・制限時間つき・最後に採点
// PC ではキーボード操作に対応（1/2/3 で解答、Enter で次へ）。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import { grade, timeLimitSeconds } from "@/lib/mockComposer";
import { DOMAIN_BY_NAME } from "@/lib/config";
import { levelFromXp } from "@/lib/progression";
import { Card, Meter } from "@/components/ui";
import { getIllustration } from "@/components/Illustrations";
import { CheckCircleIcon, FlameIcon, KeyboardIcon } from "@/components/icons";
import { answeredOn, toDateKey } from "@/lib/streak";
import { QUESTIONS } from "@/lib/questions";
import type { Question, StudyMode } from "@/lib/types";

/** 収録問題の総数（模試結果の注記に使う）。 */
const QUESTIONS_TOTAL = QUESTIONS.length;

interface Props {
  questions: Question[];
  mode: StudyMode;
  title: string;
  onExit: () => void;
  /** 「もう1セット」用（daily/practice で再抽選して続ける）。 */
  onOneMore?: () => void;
}

export function QuizRunner({ questions, mode, title, onExit, onOneMore }: Props) {
  const isMock = mode === "mock";
  if (questions.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-slate-500">出題できる問題がありません。</p>
        <button
          onClick={onExit}
          className="mt-4 rounded-xl bg-slate-200 px-5 py-2 font-bold dark:bg-slate-800"
        >
          戻る
        </button>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-2xl">
      {isMock ? (
        <MockRunner questions={questions} title={title} onExit={onExit} />
      ) : (
        <FeedbackRunner
          questions={questions}
          mode={mode}
          title={title}
          onExit={onExit}
          onOneMore={onOneMore}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 共通パーツ                                                          */
/* ------------------------------------------------------------------ */

function RunnerHeader({
  title,
  index,
  total,
  right,
  onExit,
  confirmExit = false,
}: {
  title: string;
  index: number;
  total: number;
  right?: React.ReactNode;
  onExit: () => void;
  /** true の場合、誤タップで解答が消えないよう2段階で中断する。 */
  confirmExit?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  const handleExit = () => {
    if (confirmExit && !confirming) {
      setConfirming(true);
      // 数秒で自動キャンセル（誤タップ保護）。
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    onExit();
  };

  return (
    <div className="sticky top-0 z-10 bg-white/90 px-4 pb-2 pt-4 backdrop-blur dark:bg-surface-dark/90">
      <div className="flex items-center justify-between">
        <button
          onClick={handleExit}
          className={`rounded-lg px-2 py-1 text-sm font-medium ${
            confirming
              ? "bg-rose-100 font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-300"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          {confirming ? "解答を破棄して中断する" : "← 中断"}
        </button>
        <span className="text-sm font-bold">{title}</span>
        <span className="min-w-[52px] text-right text-sm tabular-nums text-slate-500">
          {right ?? `${index + 1}/${total}`}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-accent-strong transition-[width] duration-300 dark:bg-accent"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function QuestionBody({ question }: { question: Question }) {
  const domain = DOMAIN_BY_NAME[question.domain];
  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-slate-900"
          style={{ backgroundColor: domain?.color ?? "#a3e635" }}
        >
          {domain?.shortName ?? question.domain}
        </span>
        <span className="text-[11px] text-slate-400">
          難易度 {"★".repeat(question.difficulty)}
        </span>
      </div>
      <h2 className="mt-3 text-lg font-bold leading-relaxed">
        {question.question}
      </h2>
    </div>
  );
}

function KeyboardHint() {
  return (
    <p className="mt-4 hidden items-center justify-center gap-1.5 px-4 text-center text-[11px] text-slate-400 lg:flex">
      <KeyboardIcon className="h-4 w-4" />
      キーボード操作：<kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">1</kbd>
      <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">2</kbd>
      <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">3</kbd>
      で解答 /
      <kbd className="rounded border border-slate-300 px-1 dark:border-slate-600">Enter</kbd>
      で次へ
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* フィードバック（練習）モード                                        */
/* ------------------------------------------------------------------ */

function FeedbackRunner({
  questions,
  mode,
  title,
  onExit,
  onOneMore,
}: {
  questions: Question[];
  mode: StudyMode;
  title: string;
  onExit: () => void;
  onOneMore?: () => void;
}) {
  const { recordAnswer } = useProgress();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const question = questions[index];
  const answered = selected !== null;
  const isLast = index === questions.length - 1;

  const choose = useCallback(
    (choiceIndex: number) => {
      if (answered) return;
      setSelected(choiceIndex);
      const ok = recordAnswer(question, choiceIndex, mode);
      if (ok) setCorrectCount((c) => c + 1);
    },
    [answered, question, recordAnswer, mode],
  );

  const next = useCallback(() => {
    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  }, [isLast]);

  // キーボード操作（PC）：1/2/3 で解答、Enter で次へ。
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (finished) return;
      if (e.key >= "1" && e.key <= String(question.choices.length)) {
        e.preventDefault();
        choose(Number(e.key) - 1);
      } else if (e.key === "Enter" && answered) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [choose, next, answered, finished, question.choices.length]);

  if (finished) {
    return (
      <SessionResult
        total={questions.length}
        correct={correctCount}
        mode={mode}
        onExit={onExit}
        onOneMore={onOneMore}
      />
    );
  }

  const illustration = answered ? getIllustration(question.id) : null;

  return (
    <div className="animate-pop-in pb-8">
      <RunnerHeader
        title={title}
        index={index}
        total={questions.length}
        onExit={onExit}
      />
      <QuestionBody question={question} />

      <ul className="mt-4 space-y-2.5 px-4">
        {question.choices.map((choice, i) => {
          const isCorrect = i === question.answerIndex;
          const isChosen = i === selected;
          let cls =
            "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/60";
          if (answered) {
            if (isCorrect)
              cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15";
            else if (isChosen)
              cls = "border-rose-500 bg-rose-50 dark:bg-rose-500/15";
            else cls = "border-slate-200 opacity-60 dark:border-slate-800";
          }
          return (
            <li key={i}>
              <button
                onClick={() => choose(i)}
                disabled={answered}
                aria-pressed={isChosen}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-[15px] font-medium transition-colors ${cls} ${
                  !answered
                    ? "hover:border-accent-strong active:scale-[0.99]"
                    : ""
                }`}
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-100 text-sm font-bold dark:bg-slate-800">
                  {answered && isCorrect
                    ? "○"
                    : answered && isChosen
                      ? "×"
                      : i + 1}
                </span>
                <span>{choice}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {!answered && <KeyboardHint />}

      {answered && (
        <div className="mt-4 px-4">
          <Card className="animate-pop-in">
            <p
              className={`text-sm font-black ${
                selected === question.answerIndex
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {selected === question.answerIndex ? "正解" : "不正解"}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
              {question.explanation}
            </p>
            {illustration}
            <p className="mt-2 text-[11px] text-slate-400">
              出典目安：{question.reference.edition}
              {question.reference.chapter
                ? ` / ${question.reference.chapter}`
                : ""}
              ・最終確認は公式テキストで行ってください
            </p>
          </Card>
          <button
            onClick={next}
            autoFocus
            className="mt-4 w-full rounded-2xl bg-accent py-4 text-lg font-black text-slate-900 hover:bg-accent-soft active:scale-[0.99]"
          >
            {isLast ? "結果を見る" : "次の問題へ"}
            <span className="ml-2 hidden text-xs font-bold opacity-60 lg:inline">
              Enter
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * セッション結果。習慣化のため
 * - 今日のノルマ達成を祝福
 * - 「あとN問でレベルアップ」の次の小目標
 * - 「もう1セット」導線
 * を提示する。
 */
function SessionResult({
  total,
  correct,
  mode,
  onExit,
  onOneMore,
}: {
  total: number;
  correct: number;
  mode: StudyMode;
  onExit: () => void;
  onOneMore?: () => void;
}) {
  const { state } = useProgress();
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

  const todayKey = toDateKey(new Date());
  const todayCount = answeredOn(state.answers, todayKey);
  const goal = state.settings.dailyGoal;
  const goalReached = todayCount >= goal;
  const level = levelFromXp(state.answers.length);
  const streak = state.streak.current;

  return (
    <div className="animate-pop-in px-4 py-10 text-center">
      {goalReached && mode === "daily" ? (
        <div className="mx-auto mb-6 flex max-w-sm flex-col items-center rounded-3xl bg-emerald-500/10 p-5 text-emerald-700 dark:text-emerald-300">
          <CheckCircleIcon className="h-10 w-10" />
          <p className="mt-2 text-lg font-black">今日のノルマ達成</p>
          <p className="mt-1 flex items-center gap-1 text-sm font-bold">
            <FlameIcon className="h-4 w-4 text-orange-500" />
            連続 {streak} 日目。明日も続けるとチェーンが伸びます
          </p>
        </div>
      ) : (
        <p className="text-sm font-bold text-slate-500">お疲れさまでした</p>
      )}

      <p className="counter-number mt-2 text-6xl font-black">
        {correct}
        <span className="text-2xl text-slate-400">/{total}</span>
      </p>
      {/* 正答率が低い日に祝福色で見せると白々しいので、色は成績に応じて変える。 */}
      <p
        className={`mt-1 text-lg font-bold ${
          rate >= 70
            ? "text-lime-700 dark:text-accent"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        正答率 {rate}%
      </p>
      {rate < 50 && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          正答率は今は気にしなくて大丈夫。間違えた問題ほど
          この後くり返し出題されて、だんだん解けるようになります。
        </p>
      )}
      <div className="mx-auto mt-5 max-w-xs">
        <Meter
          value={total > 0 ? correct / total : 0}
          color={rate >= 70 ? "#84cc16" : "#94a3b8"}
        />
      </div>

      {/* 次の小目標：レベルアップまでの残り */}
      <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-800/50">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-bold">
            Lv.{level.level} → Lv.{level.level + 1}
          </span>
          <span className="text-xs font-bold text-lime-700 dark:text-accent">
            あと {level.remaining} 問
          </span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-accent-strong transition-[width] duration-700"
            style={{ width: `${Math.round(level.progress * 100)}%` }}
          />
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3">
        {onOneMore && (
          <button
            onClick={onOneMore}
            className="w-full rounded-2xl bg-accent py-4 text-lg font-black text-slate-900 hover:bg-accent-soft"
          >
            もう1セット（あと{level.remaining <= total ? level.remaining : total}問でも前進）
          </button>
        )}
        <button
          onClick={onExit}
          className={`w-full rounded-2xl py-3 font-bold ${
            onOneMore
              ? "bg-slate-200 dark:bg-slate-800"
              : "bg-accent py-4 text-lg font-black text-slate-900"
          }`}
        >
          {onOneMore ? "今日はここまで" : "もう一度"}
        </button>
        {/* デイリーはホーム上のローカルstateで動くため、Link単体では戻れない。
            onExit で session を解除しつつ遷移する。 */}
        <Link
          href="/"
          onClick={onExit}
          className="w-full rounded-2xl bg-slate-100 py-3 font-bold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"
        >
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 模試モード                                                          */
/* ------------------------------------------------------------------ */

function MockRunner({
  questions,
  title,
  onExit,
}: {
  questions: Question[];
  title: string;
  onExit: () => void;
}) {
  const { recordAnswer } = useProgress();
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const limit = useMemo(
    () => timeLimitSeconds(questions.length),
    [questions.length],
  );
  const [remaining, setRemaining] = useState(limit);
  const recordedRef = useRef(false);

  const submit = useCallback(() => {
    setSubmitted(true);
  }, []);

  // タイマー
  useEffect(() => {
    if (submitted) return;
    if (remaining <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, submitted, submit]);

  const results = useMemo(() => {
    return questions.map((q, i) => ({
      domain: q.domain,
      correct: responses[i] === q.answerIndex,
    }));
  }, [questions, responses]);

  // 採点確定時に一度だけ履歴へ記録する。
  useEffect(() => {
    if (submitted && !recordedRef.current) {
      recordedRef.current = true;
      questions.forEach((q, i) => {
        recordAnswer(q, responses[i] ?? -1, "mock");
      });
    }
  }, [submitted, questions, responses, recordAnswer]);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const select = useCallback(
    (choiceIndex: number) => {
      setResponses((r) => ({ ...r, [index]: choiceIndex }));
    },
    [index],
  );

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(questions.length - 1, i + 1));
  }, [questions.length]);

  // キーボード操作（PC）：1/2/3 で選択、Enter で次へ。
  // 最終問題で全問解答済みなら Enter で採点までつながる（リズムを切らさない）。
  useEffect(() => {
    if (submitted) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= String(question.choices.length)) {
        e.preventDefault();
        select(Number(e.key) - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (!isLast) {
          goNext();
        } else if (Object.keys(responses).length === questions.length) {
          submit();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    select,
    goNext,
    isLast,
    submitted,
    question.choices.length,
    responses,
    questions.length,
    submit,
  ]);

  if (submitted) {
    return (
      <MockResult
        results={results}
        questions={questions}
        responses={responses}
        onExit={onExit}
      />
    );
  }

  const answeredCount = Object.keys(responses).length;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const lowTime = remaining <= 30;

  return (
    <div className="pb-8">
      <RunnerHeader
        title={title}
        index={index}
        total={questions.length}
        onExit={onExit}
        confirmExit
        right={
          <span
            className={`tabular-nums font-black ${lowTime ? "text-rose-500" : ""}`}
            aria-live="polite"
          >
            {mm}:{ss}
          </span>
        }
      />
      <QuestionBody question={question} />

      <ul className="mt-4 space-y-2.5 px-4">
        {question.choices.map((choice, i) => {
          const chosen = responses[index] === i;
          return (
            <li key={i}>
              <button
                onClick={() => select(i)}
                aria-pressed={chosen}
                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left text-[15px] font-medium transition-colors ${
                  chosen
                    ? "border-accent-strong bg-accent/15 dark:border-accent"
                    : "border-slate-200 bg-white hover:border-accent-strong dark:border-slate-700 dark:bg-slate-900/60"
                }`}
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-100 text-sm font-bold dark:bg-slate-800">
                  {i + 1}
                </span>
                <span>{choice}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center gap-3 px-4">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-xl bg-slate-200 px-5 py-3 font-bold disabled:opacity-40 dark:bg-slate-800"
        >
          前へ
        </button>
        {isLast ? (
          <button
            onClick={submit}
            className="flex-1 rounded-xl bg-accent py-3 font-black text-slate-900"
          >
            採点する（{answeredCount}/{questions.length} 解答済み）
          </button>
        ) : (
          <button
            onClick={goNext}
            className="flex-1 rounded-xl bg-accent-strong py-3 font-black text-slate-900 dark:bg-accent"
          >
            次へ
          </button>
        )}
      </div>
      <p className="mt-4 px-4 text-center text-[11px] text-slate-400">
        模試モードでは即時解説は表示されません。制限時間内に解答してください。
      </p>
      <KeyboardHint />
    </div>
  );
}

function MockResult({
  results,
  questions,
  responses,
  onExit,
}: {
  results: { domain: string; correct: boolean }[];
  questions: Question[];
  responses: Record<number, number>;
  onExit: () => void;
}) {
  const g = grade(results);
  const wrongItems = questions
    .map((q, i) => ({ q, chosen: responses[i] }))
    .filter(({ q, chosen }) => chosen !== q.answerIndex);
  const pct = Math.round(g.rate * 100);
  const passPct = Math.round(g.passRate * 100);
  return (
    <div className="animate-pop-in px-4 py-8">
      <p className="text-center text-sm font-bold text-slate-500">模試 結果</p>
      <div
        className={`mx-auto mt-4 flex flex-col items-center rounded-3xl p-6 ${
          g.passed
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
        }`}
      >
        <span className="text-sm font-bold">
          {g.passed ? "合格ライン到達" : "合格ライン未達"}
        </span>
        <span className="counter-number mt-1 text-6xl font-black">{pct}%</span>
        <span className="mt-1 text-sm">
          {g.correct} / {g.total} 問正解（合格ライン {passPct}%）
        </span>
      </div>

      <div className="mt-4">
        <Meter value={g.rate} color={g.passed ? "#10b981" : "#f43f5e"} />
        <div className="relative mt-1 h-4">
          <div
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${passPct}%` }}
          >
            <span className="text-[10px] font-bold text-slate-400">
              合格{passPct}%
            </span>
          </div>
        </div>
      </div>

      <h3 className="mb-2 mt-6 text-sm font-bold">分野別内訳</h3>
      <div className="space-y-3">
        {g.byDomain.map((d) => {
          const dom = DOMAIN_BY_NAME[d.domain];
          return (
            <Meter
              key={d.domain}
              value={d.rate}
              color={dom?.color ?? "#84cc16"}
              label={dom?.shortName ?? d.domain}
              rightLabel={`${d.correct}/${d.total}（${Math.round(d.rate * 100)}%）`}
            />
          );
        })}
      </div>

      {/* 間違えた問題の振り返り：結果画面から離れずに確認できる */}
      {wrongItems.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-sm font-bold">
            間違えた問題（{wrongItems.length}問）
          </h3>
          <ul className="space-y-2">
            {wrongItems.map(({ q, chosen }) => (
              <li key={q.id}>
                <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60">
                  <summary className="cursor-pointer list-none px-4 py-3">
                    <span className="text-[11px] font-bold text-slate-400">
                      {DOMAIN_BY_NAME[q.domain]?.shortName ?? q.domain}
                    </span>
                    <span className="mt-0.5 block text-sm font-medium leading-relaxed">
                      {q.question}
                    </span>
                    <span className="mt-1 block text-xs text-slate-400 group-open:hidden">
                      タップで正解と解説を表示
                    </span>
                  </summary>
                  <div className="border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
                    <p>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        あなたの解答：
                      </span>
                      {chosen != null && chosen >= 0
                        ? q.choices[chosen]
                        : "未解答"}
                    </p>
                    <p className="mt-1">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        正解：
                      </span>
                      {q.choices[q.answerIndex]}
                    </p>
                    <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">
                      {q.explanation}
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
        本模試は収録{QUESTIONS_TOTAL}問からの出題のため、学習が進むと既出問題を含みます。
        スコアはあくまで概算の実力目安としてご利用ください。
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={onExit}
          className="w-full rounded-2xl bg-accent py-4 text-lg font-black text-slate-900"
        >
          もう一度 模試に挑戦
        </button>
        <Link
          href="/review"
          className="w-full rounded-2xl bg-slate-200 py-3 text-center font-bold dark:bg-slate-800"
        >
          間違いノートで復習する
        </Link>
      </div>
    </div>
  );
}
