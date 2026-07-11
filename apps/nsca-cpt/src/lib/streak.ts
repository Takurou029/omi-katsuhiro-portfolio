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

/** ストリーク保護の最大保有数。 */
export const MAX_FREEZES = 2;
/** この日数継続するごとに保護を1つ獲得する。 */
export const FREEZE_EARN_INTERVAL = 7;

/**
 * 学習が発生した日を反映してストリークを更新する（純粋関数）。
 * - 同日中の再学習：変化なし
 * - 前日から連続：current +1
 * - ちょうど1日休み＋保護あり：保護を1つ消費してチェーン継続（current +1）
 * - それ以外（2日以上空いた／初回）：current = 1
 * 7日継続ごと（current が 7 の倍数到達時）に保護を1つ獲得（上限 MAX_FREEZES）。
 */
export function updateStreak(
  streak: StreakState,
  todayKey: string,
): StreakState {
  if (streak.lastStudyDate === todayKey) {
    return streak;
  }
  const yesterday = previousDateKey(todayKey);
  const dayBefore = previousDateKey(yesterday);

  let current: number;
  let freezes = streak.freezes ?? 0;

  if (streak.lastStudyDate === yesterday) {
    current = streak.current + 1;
  } else if (streak.lastStudyDate === dayBefore && freezes > 0) {
    // 1日だけ休んだ：保護を消費してチェーンを繋ぐ。
    freezes -= 1;
    current = streak.current + 1;
  } else {
    current = 1;
  }

  // 継続の報酬として保護を付与する。
  if (current > 0 && current % FREEZE_EARN_INTERVAL === 0) {
    freezes = Math.min(MAX_FREEZES, freezes + 1);
  }

  return {
    current,
    longest: Math.max(streak.longest, current),
    lastStudyDate: todayKey,
    freezes,
  };
}

/**
 * ストリークの「表示用」現在値。
 * 最終学習日が今日・昨日、または一昨日でも保護が残っていれば現在値を返す。
 * それ以外は途切れているので 0（保存値は書き換えない）。
 */
export function displayStreak(streak: StreakState, todayKey: string): number {
  if (!streak.lastStudyDate) return 0;
  const yesterday = previousDateKey(todayKey);
  if (streak.lastStudyDate === todayKey) return streak.current;
  if (streak.lastStudyDate === yesterday) return streak.current;
  if (
    streak.lastStudyDate === previousDateKey(yesterday) &&
    (streak.freezes ?? 0) > 0
  ) {
    return streak.current;
  }
  return 0;
}

/**
 * 「昨日休んだが保護で繋がっている」状態か。
 * この状態で今日学習すると保護を1つ消費してチェーンが継続する。
 */
export function isStreakProtected(
  streak: StreakState,
  todayKey: string,
): boolean {
  if (!streak.lastStudyDate) return false;
  const dayBefore = previousDateKey(previousDateKey(todayKey));
  return streak.lastStudyDate === dayBefore && (streak.freezes ?? 0) > 0;
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
