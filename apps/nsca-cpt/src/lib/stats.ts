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

export interface TopicCoverage {
  domain: string;
  topic: string;
  /** その分野の色。 */
  color: string;
  /** 収録問題数。 */
  total: number;
  /** 一度でも解答した問題数。 */
  attempted: number;
  /** 定着（Leitnerボックスが閾値以上）の問題数。 */
  mastered: number;
}

/**
 * サブ分野（試験範囲）ごとのカバレッジ。
 * 「まだ手をつけていない範囲」を可視化して、試験範囲の網羅を支援する。
 */
export function topicCoverage(
  questions: { id: string; domain: string; topic?: string }[],
  cards: Record<string, LeitnerCard>,
  masteryBox = 4,
): TopicCoverage[] {
  const map = new Map<string, TopicCoverage>();
  for (const q of questions) {
    const topic = q.topic ?? "その他";
    const key = `${q.domain}／${topic}`;
    const entry =
      map.get(key) ??
      {
        domain: q.domain,
        topic,
        color: DOMAINS.find((d) => d.name === q.domain)?.color ?? "#94a3b8",
        total: 0,
        attempted: 0,
        mastered: 0,
      };
    entry.total += 1;
    const card = cards[q.id];
    if (card && card.lastSeen > 0) {
      entry.attempted += 1;
      if (card.box >= masteryBox) entry.mastered += 1;
    }
    map.set(key, entry);
  }
  // 分野の定義順 → 未着手が多い順に並べる。
  const domainOrder = new Map(DOMAINS.map((d, i) => [d.name, i]));
  return [...map.values()].sort((a, b) => {
    const da = domainOrder.get(a.domain) ?? 99;
    const db = domainOrder.get(b.domain) ?? 99;
    if (da !== db) return da - db;
    return b.total - a.total;
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
