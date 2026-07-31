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

/** 分野内のサブ分野一覧（収録数つき）を返す。 */
function topicsOf(questions: Question[]): { topic: string; count: number }[] {
  const map = new Map<string, number>();
  for (const q of questions) {
    const t = q.topic ?? "その他";
    map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()].map(([topic, count]) => ({ topic, count }));
}

export default function PracticePage() {
  const { state, hydrated } = useProgress();
  const [domain, setDomain] = useState<string | "mix">("mix");
  const [topic, setTopic] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [session, setSession] = useState<Question[] | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  const counts = useMemo(() => questionCountByDomain(), []);

  // 選択中の分野に属する問題（サブ分野が選ばれていれば絞り込む）。
  const pool = useMemo(() => {
    const base = domain === "mix" ? QUESTIONS : getQuestionsByDomain(domain);
    return topic ? base.filter((q) => (q.topic ?? "その他") === topic) : base;
  }, [domain, topic]);

  const topics = useMemo(
    () => (domain === "mix" ? [] : topicsOf(getQuestionsByDomain(domain))),
    [domain],
  );

  const selectDomain = (next: string | "mix") => {
    setDomain(next);
    setTopic(null); // 分野を変えたらサブ分野の選択は解除する
  };

  const start = () => {
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

  const poolSize = pool.length;

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
              onClick={() => selectDomain("mix")}
              label="全分野ミックス"
              sub={`${QUESTIONS.length}問`}
            />
            {DOMAINS.map((d) => (
              <SelectChip
                key={d.id}
                active={domain === d.name}
                onClick={() => selectDomain(d.name)}
                label={d.shortName}
                sub={`${counts[d.name] ?? 0}問`}
                color={d.color}
              />
            ))}
          </div>

          {/* サブ分野で更に絞り込む（試験範囲を細かく潰したいとき用） */}
          {topics.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              <h3 className="mb-2 text-xs font-bold text-slate-500">
                さらに絞り込む（任意）
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTopic(null)}
                  aria-pressed={topic === null}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    topic === null
                      ? "bg-accent text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  すべて
                </button>
                {topics.map((t) => (
                  <button
                    key={t.topic}
                    onClick={() => setTopic(t.topic)}
                    aria-pressed={topic === t.topic}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      topic === t.topic
                        ? "bg-accent text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {t.topic}
                    <span className="ml-1 font-medium opacity-60">
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
