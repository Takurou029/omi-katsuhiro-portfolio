"use client";

import { useState } from "react";
import { QUESTIONS } from "@/lib/questions";
import { composeMock, timeLimitSeconds } from "@/lib/mockComposer";
import {
  DOMAIN_WEIGHTS,
  DOMAINS,
  DEFAULT_MOCK_QUESTIONS,
  PASS_RATE,
  REAL_EXAM,
} from "@/lib/config";
import { allocateByDomain } from "@/lib/mockComposer";
import { PageHeader, Card } from "@/components/ui";
import { QuizRunner } from "@/components/QuizRunner";
import { Disclaimer } from "@/components/Disclaimer";
import type { Question } from "@/lib/types";

// 10問（すきま時間）／30問（標準）／70問（本番の半分相当）
const OPTIONS = [10, DEFAULT_MOCK_QUESTIONS, 70];

export default function MockPage() {
  const [count, setCount] = useState(DEFAULT_MOCK_QUESTIONS);
  const [session, setSession] = useState<Question[] | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const maxAvailable = QUESTIONS.length;

  const start = (n: number) => {
    const size = Math.min(n, maxAvailable);
    const { questions } = composeMock(QUESTIONS, size, DOMAIN_WEIGHTS);
    setSession(questions);
    setSessionKey((k) => k + 1);
  };

  if (session) {
    return (
      <QuizRunner
        key={sessionKey}
        questions={session}
        mode="mock"
        title="模試"
        onExit={() => setSession(null)}
        onRetry={() => start(count)}
      />
    );
  }

  const alloc = allocateByDomain(Math.min(count, maxAvailable), DOMAIN_WEIGHTS);
  const limit = timeLimitSeconds(Math.min(count, maxAvailable));
  const limitMin = Math.round(limit / 60);

  return (
    <div className="animate-pop-in mx-auto w-full max-w-2xl">
      <PageHeader
        title="模試モード"
        subtitle="本番形式（即時解説なし・制限時間つき）。最後にまとめて採点します。"
      />
      <div className="space-y-4 px-4">
        <Card>
          <h2 className="mb-2 text-sm font-bold">問題数</h2>
          <div className="flex gap-2">
            {OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                aria-pressed={count === n}
                className={`flex-1 rounded-xl py-3 font-black tabular-nums transition ${
                  count === n
                    ? "bg-accent text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {Math.min(n, maxAvailable)}問
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            制限時間の目安：約 <strong>{limitMin}分</strong>
            （本番 {REAL_EXAM.questions}問 {REAL_EXAM.minutes}分 を問題数で比例配分）
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-bold">出題比率（概算・本番配点に準拠）</h2>
          <div className="space-y-2">
            {DOMAINS.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-sm">
                <span
                  className="h-3 w-3 flex-none rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="flex-1">{d.shortName}</span>
                <span className="tabular-nums text-slate-500">
                  {Math.round(d.mockWeight * 100)}% ・ {alloc[d.name] ?? 0}問
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            合格ライン：<strong>{Math.round(PASS_RATE * 100)}%</strong>（設定値）
          </p>
        </Card>

        <button
          onClick={() => start(count)}
          className="w-full rounded-2xl bg-accent py-4 text-lg font-black text-slate-900"
        >
          模試を開始する
        </button>

        <Disclaimer compact />
      </div>
    </div>
  );
}
