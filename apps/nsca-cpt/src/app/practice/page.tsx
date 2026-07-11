"use client";

import { useMemo, useState } from "react";
import { useProgress } from "@/lib/store";
import { QUESTIONS, getQuestionsByDomain, questionCountByDomain } from "@/lib/questions";
import { selectQuestions } from "@/lib/leitner";
import { DOMAINS } from "@/lib/config";
import { PageHeader, Card } from "@/components/ui";
import { QuizRunner } from "@/components/QuizRunner";
import { Disclaimer } from "@/components/Disclaimer";
import type { Question } from "@/lib/types";

const COUNTS = [5, 10, 20];

export default function PracticePage() {
  const { state, hydrated } = useProgress();
  const [domain, setDomain] = useState<string | "mix">("mix");
  const [count, setCount] = useState(10);
  const [session, setSession] = useState<Question[] | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const counts = useMemo(() => questionCountByDomain(), []);

  const start = () => {
    const pool =
      domain === "mix" ? QUESTIONS : getQuestionsByDomain(domain);
    // 弱点優先で count 問を抽選する。
    const qs = selectQuestions(pool, state.cards, count);
    if (qs.length > 0) {
      setSession(qs);
      setSessionKey((k) => k + 1);
    }
  };

  if (session) {
    return (
      <QuizRunner
        key={sessionKey}
        questions={session}
        mode="practice"
        title="練習"
        onExit={() => setSession(null)}
        onOneMore={start}
      />
    );
  }

  const poolSize =
    domain === "mix" ? QUESTIONS.length : counts[domain] ?? 0;

  return (
    <div className="animate-pop-in mx-auto w-full max-w-2xl">
      <PageHeader
        title="練習モード"
        subtitle="弱点を優先して出題します。解答直後に正誤と解説を表示。"
      />
      <div className="space-y-4 px-4">
        <Card>
          <h2 className="mb-2 text-sm font-bold">分野を選ぶ</h2>
          <div className="grid grid-cols-2 gap-2">
            <SelectChip
              active={domain === "mix"}
              onClick={() => setDomain("mix")}
              label="全分野ミックス"
              sub={`${QUESTIONS.length}問`}
            />
            {DOMAINS.map((d) => (
              <SelectChip
                key={d.id}
                active={domain === d.name}
                onClick={() => setDomain(d.name)}
                label={d.shortName}
                sub={`${counts[d.name] ?? 0}問`}
                color={d.color}
              />
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-sm font-bold">出題数</h2>
          <div className="flex gap-2">
            {COUNTS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                aria-pressed={count === c}
                className={`flex-1 rounded-xl py-3 font-black tabular-nums transition ${
                  count === c
                    ? "bg-accent text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800"
                }`}
              >
                {c}問
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            この分野の在庫は {poolSize} 問。多い場合は苦手な問題から優先して出題します。
          </p>
        </Card>

        <button
          onClick={start}
          disabled={!hydrated || poolSize === 0}
          className="w-full rounded-2xl bg-accent py-4 text-lg font-black text-slate-900 disabled:opacity-50"
        >
          スタート
        </button>

        <Disclaimer compact />
      </div>
    </div>
  );
}

function SelectChip({
  active,
  onClick,
  label,
  sub,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left transition ${
        active
          ? "border-accent-strong bg-accent/15 dark:border-accent"
          : "border-slate-200 dark:border-slate-700"
      }`}
    >
      {color && (
        <span
          className="h-3 w-3 flex-none rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{label}</span>
        <span className="block text-[11px] text-slate-400">{sub}</span>
      </span>
    </button>
  );
}
