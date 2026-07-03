"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import { getQuestionById } from "@/lib/questions";
import { wrongNoteIds } from "@/lib/leitner";
import { DOMAIN_BY_NAME } from "@/lib/config";
import { PageHeader, Card } from "@/components/ui";
import { QuizRunner } from "@/components/QuizRunner";
import type { Question } from "@/lib/types";

export default function ReviewPage() {
  const { state, hydrated } = useProgress();
  const [session, setSession] = useState<Question[] | null>(null);

  const wrongQuestions = useMemo(() => {
    return wrongNoteIds(state.cards)
      .map((id) => getQuestionById(id))
      .filter((q): q is Question => Boolean(q));
  }, [state.cards]);

  if (session) {
    return (
      <QuizRunner
        questions={session}
        mode="review"
        title="間違いノート復習"
        onExit={() => setSession(null)}
      />
    );
  }

  return (
    <div className="animate-pop-in">
      <PageHeader
        title="間違いノート"
        subtitle="直近で誤答した問題を自動で蓄積。ここだけ集中復習できます。"
      />
      <div className="space-y-4 px-4">
        {!hydrated ? (
          <div className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ) : wrongQuestions.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-slate-500">
              誤答した問題はありません 🎉
              <br />
              <Link
                href="/practice"
                className="font-bold text-accent-strong dark:text-accent"
              >
                練習モード
              </Link>
              で問題に挑戦してみましょう。
            </p>
          </Card>
        ) : (
          <>
            <button
              onClick={() => setSession(wrongQuestions)}
              className="w-full rounded-2xl bg-accent py-4 text-lg font-black text-slate-900"
            >
              まとめて復習（{wrongQuestions.length}問）
            </button>

            <ul className="space-y-2.5">
              {wrongQuestions.map((q) => {
                const domain = DOMAIN_BY_NAME[q.domain];
                const card = state.cards[q.id];
                return (
                  <li key={q.id}>
                    <button
                      onClick={() => setSession([q])}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-900"
                          style={{ backgroundColor: domain?.color ?? "#a3e635" }}
                        >
                          {domain?.shortName ?? q.domain}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          誤答 {card?.wrongCount ?? 0}回 / 正答 {card?.correctCount ?? 0}回
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium">
                        {q.question}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
