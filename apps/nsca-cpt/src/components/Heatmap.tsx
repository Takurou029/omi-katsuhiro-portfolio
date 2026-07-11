// GitHub の草（contribution graph）風ヒートマップ。
// 続けるほどマスの色が濃く積み上がる＝「チェーンを切らさない」動機づけ。
import { dailyCounts } from "@/lib/streak";
import type { AnswerRecord } from "@/lib/types";

const WEEKDAY_LABELS = ["", "月", "", "水", "", "金", ""];

/** 解答数 → 濃度レベル（0〜4）。 */
function intensity(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

const LEVEL_CLASS = [
  "bg-slate-100 dark:bg-slate-800",
  "bg-lime-200 dark:bg-lime-900",
  "bg-lime-300 dark:bg-lime-700",
  "bg-lime-500 dark:bg-lime-500",
  "bg-lime-600 dark:bg-lime-400",
];

export function Heatmap({
  answers,
  weeks = 14,
  today = new Date(),
}: {
  answers: AnswerRecord[];
  weeks?: number;
  today?: Date;
}) {
  // 今日を最終週の該当曜日に置き、日曜始まりの weeks 週分を並べる。
  const todayDow = today.getDay(); // 0=日
  const days = (weeks - 1) * 7 + todayDow + 1;
  const data = dailyCounts(answers, days, today);

  // 週ごとの列に分割。開始日は必ず日曜になるため、先頭から7日ずつ切ると
  // 各列が日曜始まりに揃う（最終列＝今週のみ部分週になる）。
  const columns: { date: string; count: number }[][] = [];
  for (let cursor = 0; cursor < data.length; cursor += 7) {
    columns.push(data.slice(cursor, cursor + 7));
  }

  const total = data.reduce((s, d) => s + d.count, 0);
  const activeDays = data.filter((d) => d.count > 0).length;

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1" role="img" aria-label={`直近${weeks}週間の学習ヒートマップ。学習日 ${activeDays} 日、合計 ${total} 問。`}>
        <div className="mr-1 flex flex-col gap-1">
          {WEEKDAY_LABELS.map((l, i) => (
            <span key={i} className="flex h-3.5 w-4 items-center text-[9px] text-slate-400">
              {l}
            </span>
          ))}
        </div>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((d) => (
              <div
                key={d.date}
                className={`h-3.5 w-3.5 rounded-[3px] ${LEVEL_CLASS[intensity(d.count)]}`}
                title={`${d.date}：${d.count}問`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          直近{weeks}週間で <strong className="text-slate-600 dark:text-slate-300">{activeDays}日</strong> 学習・
          <strong className="text-slate-600 dark:text-slate-300">{total}問</strong> 積み上げ
        </span>
        <span className="flex items-center gap-1">
          少
          {LEVEL_CLASS.map((c, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${c}`} />
          ))}
          多
        </span>
      </div>
    </div>
  );
}
