// 連続学習日数（ストリーク）と日次集計の純粋関数。

import type { AnswerRecord, StreakState } from "./types";

/** Date をローカルの YYYY-MM-DD 文字列に変換する。 */
export function toDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** YYYY-MM-DD の前日を返す。 */
export function previousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return toDateKey(date);
}

/**
 * 学習が発生した日を反映してストリークを更新する（純粋関数）。
 * - 同日中の再学習：変化なし
 * - 前日から連続：current +1
 * - それ以外（間が空いた／初回）：current = 1
 */
export function updateStreak(
  streak: StreakState,
  todayKey: string,
): StreakState {
  if (streak.lastStudyDate === todayKey) {
    return streak;
  }
  let current: number;
  if (streak.lastStudyDate && previousDateKey(todayKey) === streak.lastStudyDate) {
    current = streak.current + 1;
  } else {
    current = 1;
  }
  return {
    current,
    longest: Math.max(streak.longest, current),
    lastStudyDate: todayKey,
  };
}

/**
 * ストリークの「表示用」現在値。最終学習日が今日でも昨日でもなければ
 * 途切れているので 0 を返す（保存値は書き換えない）。
 */
export function displayStreak(streak: StreakState, todayKey: string): number {
  if (!streak.lastStudyDate) return 0;
  if (streak.lastStudyDate === todayKey) return streak.current;
  if (previousDateKey(todayKey) === streak.lastStudyDate) return streak.current;
  return 0;
}

export interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
  correct: number;
}

/**
 * 直近 days 日の日次解答数・正答数を返す（古い→新しい順）。
 */
export function dailyCounts(
  answers: AnswerRecord[],
  days: number,
  today: Date = new Date(),
): DailyCount[] {
  const buckets: DailyCount[] = [];
  const index = new Map<string, DailyCount>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    const entry = { date: key, count: 0, correct: 0 };
    buckets.push(entry);
    index.set(key, entry);
  }
  for (const a of answers) {
    const key = toDateKey(new Date(a.timestamp));
    const entry = index.get(key);
    if (entry) {
      entry.count += 1;
      if (a.correct) entry.correct += 1;
    }
  }
  return buckets;
}

/** ある日（既定は今日）の解答数。 */
export function answeredOn(
  answers: AnswerRecord[],
  dateKey: string,
): number {
  return answers.filter((a) => toDateKey(new Date(a.timestamp)) === dateKey)
    .length;
}
