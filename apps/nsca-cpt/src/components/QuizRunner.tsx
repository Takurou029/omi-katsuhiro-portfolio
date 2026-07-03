"use client";

// 練習／今日の3問／間違いノート／模試 で共通利用する出題ランナー。
// - feedback モード（practice/daily/review）：解答直後に正誤＋解説を表示
// - mock モード：即時解説なし・制限時間つき・最後に採点

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import { grade, timeLimitSeconds } from "@/lib/mockComposer";
import { DOMAIN_BY_NAME } from "@/lib/config";
import { Card, Meter } from "@/components/ui";
import type { Question, StudyMode } from "@/lib/types";

interface Props {
  questions: Question[];
  mode: StudyMode;
  title: string;
  onExit: () => void;
}

export function QuizRunner({ questions, mode, title, onExit }: Props) {
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
  return isMock ? (
    <MockRunner questions={questions} title={title} onExit={onExit} />
  ) : (
    <FeedbackRunner
      questions={questions}
      mode={mode}
      title={title}
      onExit={onExit}
    />
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
}: {
  title: string;
  index: number;
  total: number;
  right?: React.ReactNode;
  onExit: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 bg-slate-50/90 px-4 pb-2 pt-4 backdrop-blur dark:bg-surface-dark/90">
      <div className="flex items-center justify-between">
        <button
          onClick={onExit}
          className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          ← 中断
        </button>
        <span className="text-sm font-bold">{title}</span>
        <span className="min-w-[52px] text-right text-sm tabular-nums text-slate-500">
          {right ?? `${index + 1}/${total}`}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-accent-strong transition-[width] duration-300 dark:bg-accent"
          style={{ width: `${((index) / total) * 100}%` }}
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

/* ------------------------------------------------------------------ */
/* フィードバック（練習）モード                                        */
/* ------------------------------------------------------------------ */

function FeedbackRunner({
  questions,
  mode,
  title,
  onExit,
}: {
  questions: Question[];
  mode: StudyMode;
  title: string;
  onExit: () => void;
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

  if (finished) {
    return (
      <SimpleResult
        total={questions.length}
        correct={correctCount}
        onExit={onExit}
      />
    );
  }

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
                      : String.fromCharCode(65 + i)}
                </span>
                <span>{choice}</span>
              </button>
            </li>
          );
        })}
      </ul>

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
              {selected === question.answerIndex ? "正解！" : "不正解"}
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-slate-700 dark:text-slate-300">
              {question.explanation}
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              出典目安：{question.reference.edition}
              {question.reference.chapter
                ? ` / ${question.reference.chapter}`
                : ""}
            </p>
          </Card>
          <button
            onClick={next}
            className="mt-4 w-full rounded-2xl bg-accent py-4 text-lg font-black text-slate-900 active:scale-[0.99]"
          >
            {isLast ? "結果を見る" : "次の問題へ →"}
          </button>
        </div>
      )}
    </div>
  );
}

function SimpleResult({
  total,
  correct,
  onExit,
}: {
  total: number;
  correct: number;
  onExit: () => void;
}) {
  const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="animate-pop-in px-4 py-10 text-center">
      <p className="text-sm font-bold text-slate-500">お疲れさまでした</p>
      <p className="counter-number mt-3 text-6xl font-black">
        {correct}
        <span className="text-2xl text-slate-400">/{total}</span>
      </p>
      <p className="mt-1 text-lg font-bold text-accent-strong dark:text-accent">
        正答率 {rate}%
      </p>
      <div className="mx-auto mt-6 max-w-xs">
        <Meter value={correct / total} />
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={onExit}
          className="w-full rounded-2xl bg-accent py-4 text-lg font-black text-slate-900"
        >
          もう一度
        </button>
        <Link
          href="/"
          className="w-full rounded-2xl bg-slate-200 py-3 font-bold dark:bg-slate-800"
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
  const limit = useMemo(() => timeLimitSeconds(questions.length), [
    questions.length,
  ]);
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

  // 採点確定時に一度だけ履歴へ記録する。
  const results = useMemo(() => {
    return questions.map((q, i) => ({
      domain: q.domain,
      correct: responses[i] === q.answerIndex,
    }));
  }, [questions, responses]);

  useEffect(() => {
    if (submitted && !recordedRef.current) {
      recordedRef.current = true;
      questions.forEach((q, i) => {
        recordAnswer(q, responses[i] ?? -1, "mock");
      });
    }
  }, [submitted, questions, responses, recordAnswer]);

  if (submitted) {
    return <MockResult results={results} onExit={onExit} />;
  }

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.keys(responses).length;
  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, "0");
  const lowTime = remaining <= 30;

  const select = (choiceIndex: number) => {
    setResponses((r) => ({ ...r, [index]: choiceIndex }));
  };

  return (
    <div className="pb-8">
      <RunnerHeader
        title={title}
        index={index}
        total={questions.length}
        onExit={onExit}
        right={
          <span
            className={`tabular-nums font-black ${
              lowTime ? "text-rose-500" : ""
            }`}
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
                  {String.fromCharCode(65 + i)}
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
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="flex-1 rounded-xl bg-accent-strong py-3 font-black text-slate-900 dark:bg-accent"
          >
            次へ
          </button>
        )}
      </div>
      <p className="mt-4 px-4 text-center text-[11px] text-slate-400">
        模試モードでは即時解説は表示されません。制限時間内に解答してください。
      </p>
    </div>
  );
}

function MockResult({
  results,
  onExit,
}: {
  results: { domain: string; correct: boolean }[];
  onExit: () => void;
}) {
  const g = grade(results);
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

      <div className="mt-8 flex flex-col gap-3">
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
