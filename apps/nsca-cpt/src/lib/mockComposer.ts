// 模試の出題構成・制限時間・採点ロジック（純粋関数）。

import { PASS_RATE, REAL_EXAM } from "./config";
import type { AnswerRecord, Question } from "./types";
import type { Rng } from "./leitner";

/**
 * 出題比率に基づき、各分野へ問題数を配分する。
 * 端数は「最大剰余法（largest remainder）」で処理し、合計を total に一致させる。
 */
export function allocateByDomain(
  total: number,
  weights: Record<string, number>,
): Record<string, number> {
  const domains = Object.keys(weights);
  const weightSum = domains.reduce((s, d) => s + weights[d], 0);
  if (weightSum <= 0 || total <= 0) {
    return Object.fromEntries(domains.map((d) => [d, 0]));
  }

  const raw = domains.map((d) => ({
    domain: d,
    exact: (weights[d] / weightSum) * total,
  }));

  const result: Record<string, number> = {};
  let allocated = 0;
  for (const r of raw) {
    result[r.domain] = Math.floor(r.exact);
    allocated += result[r.domain];
  }

  // 余りを、剰余（小数部）が大きい分野から順に1問ずつ配る。
  let remainder = total - allocated;
  const byFraction = [...raw].sort(
    (a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)),
  );
  let i = 0;
  while (remainder > 0 && byFraction.length > 0) {
    result[byFraction[i % byFraction.length].domain] += 1;
    remainder--;
    i++;
  }

  return result;
}

/** 配列から重複なく n 個をランダムに取り出す（rng 注入で決定的テスト可）。 */
function sample<T>(arr: T[], n: number, rng: Rng): T[] {
  const copy = [...arr];
  const out: T[] = [];
  const take = Math.min(n, copy.length);
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

export interface ComposeResult {
  questions: Question[];
  /** 分野ごとの目標数と実際に用意できた数（不足の可視化に使う）。 */
  allocation: Record<string, { target: number; actual: number }>;
}

/**
 * 出題比率に沿って模試問題を構成する。
 * ある分野で問題が不足する場合はある分だけ採用し、不足分は他分野から補充する。
 */
export function composeMock(
  questions: Question[],
  total: number,
  weights: Record<string, number>,
  rng: Rng = Math.random,
): ComposeResult {
  const allocation = allocateByDomain(total, weights);
  const byDomain: Record<string, Question[]> = {};
  for (const q of questions) {
    (byDomain[q.domain] ||= []).push(q);
  }

  const picked: Question[] = [];
  const usedIds = new Set<string>();
  const detail: Record<string, { target: number; actual: number }> = {};

  for (const domain of Object.keys(allocation)) {
    const target = allocation[domain];
    const available = byDomain[domain] ?? [];
    const chosen = sample(available, target, rng);
    chosen.forEach((q) => usedIds.add(q.id));
    detail[domain] = { target, actual: chosen.length };
    picked.push(...chosen);
  }

  // 不足分を、残っている全問題から補充する。
  if (picked.length < total) {
    const remaining = questions.filter((q) => !usedIds.has(q.id));
    const fill = sample(remaining, total - picked.length, rng);
    picked.push(...fill);
  }

  return { questions: picked, allocation: detail };
}

/**
 * 制限時間（秒）。本番（155問・180分）を問題数に応じて比例配分する。
 */
export function timeLimitSeconds(
  total: number,
  real: { questions: number; minutes: number } = REAL_EXAM,
): number {
  if (real.questions <= 0) return 0;
  const seconds = (real.minutes * 60) * (total / real.questions);
  return Math.round(seconds);
}

export interface DomainScore {
  domain: string;
  correct: number;
  total: number;
  rate: number;
}

export interface GradeResult {
  correct: number;
  total: number;
  rate: number;
  passed: boolean;
  passRate: number;
  byDomain: DomainScore[];
}

/**
 * 採点する。合格ライン（既定70%）との比較と、分野別内訳を返す。
 */
export function grade(
  answers: Pick<AnswerRecord, "domain" | "correct">[],
  passRate: number = PASS_RATE,
): GradeResult {
  const total = answers.length;
  const correct = answers.filter((a) => a.correct).length;
  const rate = total > 0 ? correct / total : 0;

  const domainMap = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const cur = domainMap.get(a.domain) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (a.correct) cur.correct += 1;
    domainMap.set(a.domain, cur);
  }

  const byDomain: DomainScore[] = [...domainMap.entries()].map(
    ([domain, v]) => ({
      domain,
      correct: v.correct,
      total: v.total,
      rate: v.total > 0 ? v.correct / v.total : 0,
    }),
  );

  return {
    correct,
    total,
    rate,
    passed: rate >= passRate,
    passRate,
    byDomain,
  };
}
