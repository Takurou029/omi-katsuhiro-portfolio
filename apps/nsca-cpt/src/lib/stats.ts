// 統計・到達度の計算（純粋関数）。

import { DOMAINS } from "./config";
import type { AnswerRecord, LeitnerCard } from "./types";

export interface DomainProficiency {
  domain: string;
  shortName: string;
  color: string;
  answered: number;
  correct: number;
  /** 正答率（0〜1）。未解答は 0。 */
  rate: number;
}

/**
 * 分野別の到達度（正答率）。全解答履歴から集計する。
 */
export function domainProficiency(
  answers: AnswerRecord[],
): DomainProficiency[] {
  return DOMAINS.map((d) => {
    const inDomain = answers.filter((a) => a.domain === d.name);
    const correct = inDomain.filter((a) => a.correct).length;
    return {
      domain: d.name,
      shortName: d.shortName,
      color: d.color,
      answered: inDomain.length,
      correct,
      rate: inDomain.length > 0 ? correct / inDomain.length : 0,
    };
  });
}

/** 累計正答率（0〜1）。 */
export function overallAccuracy(answers: AnswerRecord[]): number {
  if (answers.length === 0) return 0;
  return answers.filter((a) => a.correct).length / answers.length;
}

/**
 * 正答率の推移（移動的な累積正答率）を、直近 n 件について返す。
 */
export function accuracyTrend(
  answers: AnswerRecord[],
  window = 10,
): number[] {
  const trend: number[] = [];
  for (let i = 0; i < answers.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = answers.slice(start, i + 1);
    const correct = slice.filter((a) => a.correct).length;
    trend.push(correct / slice.length);
  }
  return trend;
}

/** Leitner のボックス分布（定着度の可視化用）。 */
export function boxDistribution(
  cards: Record<string, LeitnerCard>,
  numBoxes: number,
): number[] {
  const dist = new Array(numBoxes).fill(0);
  for (const c of Object.values(cards)) {
    const idx = Math.min(numBoxes, Math.max(1, c.box)) - 1;
    dist[idx] += 1;
  }
  return dist;
}
