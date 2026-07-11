"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import {
  accuracyTrend,
  boxDistribution,
  domainProficiency,
  overallAccuracy,
} from "@/lib/stats";
import { dailyCounts } from "@/lib/streak";
import { NUM_BOXES } from "@/lib/config";
import { PageHeader, Card, Meter, StatTile } from "@/components/ui";
import { WeekChart } from "@/components/WeekChart";
import { Heatmap } from "@/components/Heatmap";

export default function StatsPage() {
  const { state, hydrated } = useProgress();

  const proficiency = useMemo(
    () => domainProficiency(state.answers),
    [state.answers],
  );
  const overall = overallAccuracy(state.answers);
  const trend = useMemo(
    () => accuracyTrend(state.answers, 10),
    [state.answers],
  );
  const boxes = useMemo(
    () => boxDistribution(state.cards, NUM_BOXES),
    [state.cards],
  );
  const week = useMemo(() => dailyCounts(state.answers, 7), [state.answers]);

  const studyDays = useMemo(() => {
    const set = new Set(
      state.answers.map((a) => new Date(a.timestamp).toDateString()),
    );
    return set.size;
  }, [state.answers]);

  if (!hydrated) {
    return (
      <div className="p-4 pt-10">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  const empty = state.answers.length === 0;

  return (
    <div className="animate-pop-in mx-auto w-full max-w-4xl">
      <PageHeader title="統計 / 振り返り" subtitle="学習の積み上げを可視化。" />

      {empty ? (
        <div className="px-4">
          <Card>
            <p className="text-center text-sm text-slate-500">
              まだデータがありません。
              <br />
              <Link
                href="/"
                className="font-bold text-accent-strong dark:text-accent"
              >
                今日の問題
              </Link>
              から始めましょう。
            </p>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 px-4 lg:grid-cols-2">
          <div className="grid grid-cols-3 gap-2.5 lg:col-span-2">
            <StatTile
              value={`${Math.round(overall * 100)}%`}
              label="累計正答率"
              accent
            />
            <StatTile value={state.answers.length} label="累計解答" />
            <StatTile value={studyDays} label="学習日数" />
          </div>

          <Card className="lg:col-span-2">
            <h2 className="mb-3 text-sm font-bold">学習の記録（ヒートマップ）</h2>
            <Heatmap answers={state.answers} weeks={20} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold">正答率の推移（直近10問移動）</h2>
            <TrendChart trend={trend} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold">分野別 到達度</h2>
            <div className="space-y-3">
              {proficiency.map((p) => (
                <Meter
                  key={p.domain}
                  value={p.rate}
                  color={p.color}
                  label={p.shortName}
                  rightLabel={
                    p.answered > 0
                      ? `${p.correct}/${p.answered}（${Math.round(p.rate * 100)}%）`
                      : "未挑戦"
                  }
                />
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-bold">直近7日の学習</h2>
            <WeekChart data={week} />
          </Card>

          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-bold">定着度（Leitner ボックス分布）</h2>
            </div>
            <p className="mb-3 text-[11px] text-slate-400">
              左（Box1）ほど苦手・高頻度で再出題。右へ進むほど定着。
            </p>
            <BoxChart boxes={boxes} />
          </Card>
        </div>
      )}
    </div>
  );
}

function TrendChart({ trend }: { trend: number[] }) {
  if (trend.length === 0) return null;
  const w = 300;
  const h = 80;
  const pts = trend.map((v, i) => {
    const x = trend.length === 1 ? w : (i / (trend.length - 1)) * w;
    const y = h - v * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = Math.round(trend[trend.length - 1] * 100);
  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-24 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label={`直近の正答率は約${last}%`}
      >
        <line x1="0" y1={h * 0.3} x2={w} y2={h * 0.3} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="4" strokeWidth="1" />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#84cc16"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="mt-1 text-right text-xs font-bold text-accent-strong dark:text-accent">
        直近 {last}%
      </p>
    </div>
  );
}

function BoxChart({ boxes }: { boxes: number[] }) {
  const max = Math.max(1, ...boxes);
  return (
    <div className="flex items-end justify-between gap-2">
      {boxes.map((n, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex h-20 w-full items-end">
            <div
              className="w-full rounded-t-md bg-sky-400 dark:bg-sky-500"
              style={{
                height: `${Math.max(4, (n / max) * 100)}%`,
                opacity: 0.4 + (i / boxes.length) * 0.6,
              }}
            />
          </div>
          <span className="tabular-nums text-xs font-bold">{n}</span>
          <span className="text-[10px] text-slate-400">Box{i + 1}</span>
        </div>
      ))}
    </div>
  );
}
