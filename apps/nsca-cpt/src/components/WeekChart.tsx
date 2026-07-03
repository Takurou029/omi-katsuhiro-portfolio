// 直近7日の学習グラフ（解答数を棒で表示）。SVG 非依存の div ベースで軽量に。
import type { DailyCount } from "@/lib/streak";

const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

export function WeekChart({ data }: { data: DailyCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end justify-between gap-1.5" aria-hidden="false">
      {data.map((d) => {
        const h = Math.round((d.count / max) * 100);
        const date = new Date(d.date + "T00:00:00");
        const wd = WEEKDAY[date.getDay()];
        return (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-24 w-full items-end">
              <div
                className={`w-full rounded-t-md transition-[height] duration-500 ${
                  d.count > 0
                    ? "bg-accent-strong dark:bg-accent"
                    : "bg-slate-200 dark:bg-slate-800"
                }`}
                style={{ height: `${Math.max(4, h)}%` }}
                title={`${d.date}: ${d.count}問（正答${d.correct}）`}
              />
            </div>
            <span className="tabular-nums text-[11px] font-bold">
              {d.count}
            </span>
            <span className="text-[10px] text-slate-400">{wd}</span>
          </div>
        );
      })}
    </div>
  );
}
