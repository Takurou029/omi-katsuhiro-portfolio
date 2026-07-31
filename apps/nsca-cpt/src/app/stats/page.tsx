"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useProgress } from "@/lib/store";
import {
  accuracyTrend,
  boxDistribution,
  domainProficiency,
  overallAccuracy,
  topicCoverage,
} from "@/lib/stats";
import { QUESTIONS } from "@/lib/questions";
import { NUM_BOXES } from "@/lib/config";
import { PageHeader, Card, Meter, StatTile } from "@/components/ui";
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
  const coverage = useMemo(
    () => topicCoverage(QUESTIONS, state.cards),
    [state.cards],
  );

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
            {/* ホームと同じ期間（14週）に統一して混乱を避ける */}
            <Heatmap answers={state.answers} />
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

          <Card className="lg:col-span-2">
            <h2 className="text-sm font-bold">試験範囲のカバレッジ</h2>
            <p className="mb-3 mt-1 text-[11px] text-slate-400">
              サブ分野ごとの「解いた問題数／収録数」。手つかずの範囲を把握できます。
            </p>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {coverage.map((c) => {
                const rate = c.total > 0 ? c.attempted / c.total : 0;
                return (
                  <div key={`${c.domain}-${c.topic}`}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 font-medium">
                        <span
                          className="h-2 w-2 flex-none rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="truncate">{c.topic}</span>
                      </span>
                      <span className="flex-none tabular-nums text-slate-400">
                        {c.attempted}/{c.total}
                        {c.mastered > 0 && (
                          <span className="ml-1 text-sky-600 dark:text-sky-400">
                            定着{c.mastered}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${Math.round(rate * 100)}%`,
                          backgroundColor: c.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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
        role="img"
        aria-label={`直近の正答率は約${last}%。点線は合格ライン70%。`}
      >
        {/* 目盛り（100% / 50%）と合格ライン（70%） */}
        {[
          { p: 1, label: "100%" },
          { p: 0.5, label: "50%" },
        ].map(({ p, label }) => (
          <g key={label}>
            <line
              x1="0"
              y1={h * (1 - p)}
              x2={w}
              y2={h * (1 - p)}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-700"
              strokeWidth="0.75"
            />
            <text
              x="2"
              y={h * (1 - p) + 9}
              fontSize="8"
              fill="currentColor"
              className="text-slate-400 dark:text-slate-500"
            >
              {label}
            </text>
          </g>
        ))}
        <line
          x1="0"
          y1={h * 0.3}
          x2={w}
          y2={h * 0.3}
          stroke="currentColor"
          className="text-slate-300 dark:text-slate-600"
          strokeDasharray="4"
          strokeWidth="1"
        />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#84cc16"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* ラベル類は折れ線より後に描画し（SVGは後勝ち）、
            背景チップ付きで線が重なっても読めるようにする */}
        <rect
          x={w - 88}
          y={h * 0.3 - 14}
          width="86"
          height="13"
          rx="4"
          className="fill-white dark:fill-slate-900"
          opacity="0.9"
        />
        <text
          x={w - 6}
          y={h * 0.3 - 4}
          textAnchor="end"
          fontSize="9"
          fill="currentColor"
          className="text-slate-500 dark:text-slate-400"
        >
          合格ライン 70%
        </text>
        <rect
          x="0"
          y={h - 11}
          width="18"
          height="11"
          rx="3"
          className="fill-white dark:fill-slate-900"
          opacity="0.9"
        />
        <text
          x="2"
          y={h - 2}
          fontSize="8"
          fill="currentColor"
          className="text-slate-400 dark:text-slate-500"
        >
          0%
        </text>
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
