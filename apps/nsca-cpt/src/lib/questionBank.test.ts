// 問題バンク（questions.json）そのものの健全性テスト。
// 問題を追加したときに、形式ミスや偏りを自動で検出する。
import { describe, it, expect } from "vitest";
import { QUESTIONS } from "./questions";
import { DOMAINS, DOMAIN_WEIGHTS } from "./config";
import { topicCoverage } from "./stats";
import { allocateByDomain } from "./mockComposer";

describe("questions.json のデータ健全性", () => {
  it("IDが重複していない", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("すべての問題が定義済みの分野に属する", () => {
    const names = new Set(DOMAINS.map((d) => d.name));
    for (const q of QUESTIONS) {
      expect(names.has(q.domain)).toBe(true);
    }
  });

  it("選択肢が3つで、answerIndex が範囲内", () => {
    for (const q of QUESTIONS) {
      expect(q.choices).toHaveLength(3);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.choices.length);
    }
  });

  it("選択肢に重複がなく、空文字もない", () => {
    for (const q of QUESTIONS) {
      const set = new Set(q.choices.map((c) => c.trim()));
      expect(set.size).toBe(q.choices.length);
      for (const c of q.choices) expect(c.trim().length).toBeGreaterThan(0);
    }
  });

  it("問題文・解説・難易度が揃っている", () => {
    for (const q of QUESTIONS) {
      expect(q.question.trim().length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(q.difficulty);
    }
  });

  it("すべての問題にサブ分野（topic）が設定されている", () => {
    for (const q of QUESTIONS) {
      expect(q.topic && q.topic.length > 0).toBe(true);
    }
  });

  it("正解の位置が特定の選択肢に偏っていない", () => {
    const dist = [0, 0, 0];
    for (const q of QUESTIONS) dist[q.answerIndex] += 1;
    const expected = QUESTIONS.length / 3;
    // 各位置が期待値の ±30% に収まること（勘で当てられないようにする）
    for (const n of dist) {
      expect(n).toBeGreaterThan(expected * 0.7);
      expect(n).toBeLessThan(expected * 1.3);
    }
  });
});

describe("試験範囲のカバレッジ", () => {
  it("各分野の収録数が公式の出題比率に概ね沿っている", () => {
    const total = QUESTIONS.length;
    const target = allocateByDomain(total, DOMAIN_WEIGHTS);
    for (const d of DOMAINS) {
      const actual = QUESTIONS.filter((q) => q.domain === d.name).length;
      // 目標比率から±20%以内の収録数を維持する
      expect(actual).toBeGreaterThan(target[d.name] * 0.8);
      expect(actual).toBeLessThan(target[d.name] * 1.2);
    }
  });

  it("各分野が複数のサブ分野をカバーしている", () => {
    const coverage = topicCoverage(QUESTIONS, {});
    for (const d of DOMAINS) {
      const topics = coverage.filter((c) => c.domain === d.name);
      expect(topics.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("サブ分野ごとに最低2問は収録されている", () => {
    const coverage = topicCoverage(QUESTIONS, {});
    for (const c of coverage) {
      expect(c.total).toBeGreaterThanOrEqual(2);
    }
  });

  it("模試（本番相当140問）を構成できる十分な収録数がある", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(140);
  });
});
