"use client";

// 「積み上げ」カード：レベル・累計・定着数・マイルストーン。
// 数字が減らない指標だけを見せ、積み上がる実感でモチベーションを支える。
import { useMemo } from "react";
import {
  levelFromXp,
  milestoneInfo,
  masteredCount,
  almostMasteredCount,
  totalStudyDays,
} from "@/lib/progression";
import { QUESTIONS } from "@/lib/questions";
import { dailyCounts } from "@/lib/streak";
import type { AnswerRecord, LeitnerCard } from "@/lib/types";
import { TrophyIcon, TrendingUpIcon } from "./icons";

export function ProgressionCard({
  answers,
  cards,
}: {
  answers: AnswerRecord[];
  cards: Record<string, LeitnerCard>;
}) {
  const total = answers.length;
  const level = levelFromXp(total);
  const milestone = milestoneInfo(total);
  const mastered = masteredCount(cards);
  const almostMastered = almostMasteredCount(cards);
  const days = totalStudyDays(answers);

  // 直近30日の累積カーブ（右肩上がりしか描かれない＝積み上げの実感）。
  const cumulative = useMemo(() => {
    const daily = dailyCounts(answers, 30);
    const before = total - daily.reduce((s, d) => s + d.count, 0);
    let acc = before;
    return daily.map((d) => {
      acc += d.count;
      return acc;
    });
  }, [answers, total]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <TrendingUpIcon className="h-4 w-4 text-accent-strong" />
          積み上げ
        </h2>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-accent dark:bg-slate-800">
          Lv.{level.level}
        </span>
      </div>

      {/* 累計解答：主役の数字 */}
      <div className="mt-3 flex items-end gap-2">
        <span className="counter-number text-5xl font-black leading-none">
          {total}
        </span>
        <span className="mb-1 text-sm font-bold text-slate-500">問 積み上げた</span>
      </div>

      {/* レベル進捗：常に「あと少し」の目標を見せる */}
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-bold text-slate-500">
            Lv.{level.level + 1} まであと{" "}
            <span className="text-accent-strong">{level.remaining}問</span>
          </span>
          <span className="tabular-nums text-slate-400">
            {total - level.currentFloor}/{level.nextAt - level.currentFloor}
          </span>
        </div>
        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-accent-strong transition-[width] duration-500"
            style={{ width: `${Math.round(level.progress * 100)}%` }}
          />
        </div>
      </div>

      {/* 累積カーブ（下がらないグラフ） */}
      <CumulativeSpark values={cumulative} />

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center dark:border-slate-800">
        <div>
          <p className="counter-number text-xl font-black">{days}</p>
          <p className="text-[11px] font-medium text-slate-400">学習日数</p>
        </div>
        <div>
          <p className="counter-number text-xl font-black">
            {mastered}
            <span className="text-xs text-slate-400">/{QUESTIONS.length}</span>
          </p>
          <p className="text-[11px] font-medium text-slate-400">定着した問題</p>
        </div>
        <div>
          <p className="counter-number text-xl font-black">
            {milestone.next ?? "MAX"}
          </p>
          <p className="text-[11px] font-medium text-slate-400">次の節目</p>
        </div>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        定着＝繰り返し正解して復習間隔が伸びた問題（間違えるとやり直しになります）
      </p>
      {almostMastered > 0 && (
        <p className="mt-1 text-xs font-bold text-sky-600 dark:text-sky-400">
          もうすぐ定着 {almostMastered}問（あと1回正解で定着します）
        </p>
      )}

      {milestone.next && (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <TrophyIcon className="h-4 w-4 flex-none text-amber-500" />
          累計{milestone.next}問まであと {milestone.next - total} 問
        </p>
      )}
    </div>
  );
}

/** 直近30日の累積解答数カーブ。単調増加しか描かれない。 */
function CumulativeSpark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const w = 300;
  const h = 48;
  const min = values[0];
  const max = Math.max(values[values.length - 1], min + 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 4 - ((v - min) / (max - min)) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `0,${h} ${pts.join(" ")} ${w},${h}`;
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none" aria-label="直近30日の累計解答数の推移">
        <polygon points={area} fill="#a3e635" opacity="0.25" />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="#65a30d"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-right text-[10px] text-slate-400">直近30日の累計推移</p>
    </div>
  );
}
