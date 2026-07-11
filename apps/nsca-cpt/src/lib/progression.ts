// 積み上げの可視化（レベル・マイルストーン・定着数）。
// 「累計どれだけ積み上げたか」をモチベーションに変換する純粋関数群。

import type { AnswerRecord, LeitnerCard } from "./types";

/**
 * レベルの閾値。レベル n に必要な累計解答数 = 5 * n * (n+1) / 2。
 * 序盤は速く上がり（Lv2:5問, Lv3:15問, Lv4:30問…）、徐々に間隔が伸びる。
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const n = level - 1;
  return (5 * n * (n + 1)) / 2;
}

export interface LevelInfo {
  level: number;
  /** 現在レベルの開始XP。 */
  currentFloor: number;
  /** 次のレベルに必要な累計XP。 */
  nextAt: number;
  /** 次のレベルまでの残り問数。 */
  remaining: number;
  /** 現在レベル内の進捗（0〜1）。 */
  progress: number;
}

/** 累計解答数（XP）からレベル情報を求める。 */
export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const currentFloor = xpForLevel(level);
  const nextAt = xpForLevel(level + 1);
  const span = nextAt - currentFloor;
  return {
    level,
    currentFloor,
    nextAt,
    remaining: nextAt - xp,
    progress: span > 0 ? (xp - currentFloor) / span : 0,
  };
}

/** 累計解答のマイルストーン。 */
export const MILESTONES = [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000];

export interface MilestoneInfo {
  /** 直近に達成したマイルストーン（未達成なら null）。 */
  reached: number | null;
  /** 次のマイルストーン（すべて達成済みなら null）。 */
  next: number | null;
  /** 次のマイルストーンへの進捗（0〜1）。 */
  progress: number;
}

export function milestoneInfo(total: number): MilestoneInfo {
  let reached: number | null = null;
  let next: number | null = null;
  for (const m of MILESTONES) {
    if (total >= m) reached = m;
    else {
      next = m;
      break;
    }
  }
  const base = reached ?? 0;
  const progress = next ? (total - base) / (next - base) : 1;
  return { reached, next, progress };
}

/** 定着済み（Leitner ボックス4以上）の問題数。 */
export function masteredCount(
  cards: Record<string, LeitnerCard>,
  threshold = 4,
): number {
  return Object.values(cards).filter((c) => c.box >= threshold).length;
}

/**
 * もうすぐ定着（あと1回正解で定着）の問題数。
 * 「定着 0」の期間が長く続くと折れやすいため、中間の進捗として見せる。
 */
export function almostMasteredCount(
  cards: Record<string, LeitnerCard>,
  threshold = 4,
): number {
  return Object.values(cards).filter((c) => c.box === threshold - 1).length;
}

/** 学習した日数（ユニーク日数）。 */
export function totalStudyDays(answers: AnswerRecord[]): number {
  const set = new Set<string>();
  for (const a of answers) {
    const d = new Date(a.timestamp);
    set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  return set.size;
}
