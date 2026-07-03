// 問題データの読み込みと、分野ごとの取得ヘルパー。
// questions.json はビルド時にバンドルされるため、オフラインでも問題演習が動く。

import raw from "@/data/questions.json";
import { DOMAINS } from "./config";
import type { Question } from "./types";

export const QUESTIONS: Question[] = raw as Question[];

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

export function getQuestionsByDomain(domainName: string): Question[] {
  return QUESTIONS.filter((q) => q.domain === domainName);
}

/** 分野名 -> 問題数。 */
export function questionCountByDomain(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const d of DOMAINS) map[d.name] = 0;
  for (const q of QUESTIONS) map[q.domain] = (map[q.domain] ?? 0) + 1;
  return map;
}
