// 汎用の見た目コンポーネント。
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="px-4 pb-2 pt-6">
      <h1 className="text-2xl font-black tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      )}
    </header>
  );
}

/** 到達度メーター（0〜1）。 */
export function Meter({
  value,
  color = "#84cc16",
  label,
  rightLabel,
}: {
  value: number;
  color?: string;
  label?: string;
  rightLabel?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div>
      {(label || rightLabel) && (
        <div className="mb-1 flex items-baseline justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">
            {rightLabel}
          </span>
        </div>
      )}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ? `${label} ${pct}%` : `${pct}%`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function StatTile({
  value,
  label,
  accent = false,
}: {
  value: ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl p-3 text-center ${
        accent
          ? "bg-accent text-slate-900"
          : "bg-slate-100 text-slate-900 dark:bg-slate-800/70 dark:text-slate-100"
      }`}
    >
      <span className="counter-number text-2xl font-black">{value}</span>
      <span className="mt-0.5 text-[11px] font-medium opacity-80">{label}</span>
    </div>
  );
}
