import { describe, it, expect } from "vitest";
import {
  allocateByDomain,
  composeMock,
  grade,
  timeLimitSeconds,
  timerTone,
} from "./mockComposer";
import type { Question } from "./types";

const WEIGHTS = {
  "エクササイズテクニック": 0.31,
  "プログラムデザイン": 0.31,
  "面談と評価": 0.25,
  "安全性・法的": 0.13,
};

describe("allocateByDomain", () => {
  it("配分の合計が total に一致する（最大剰余法）", () => {
    for (const total of [10, 30, 31, 100, 155, 7]) {
      const alloc = allocateByDomain(total, WEIGHTS);
      const sum = Object.values(alloc).reduce((s, n) => s + n, 0);
      expect(sum).toBe(total);
    }
  });

  it("比率が高い分野ほど多く配分される", () => {
    const alloc = allocateByDomain(100, WEIGHTS);
    expect(alloc["エクササイズテクニック"]).toBeGreaterThan(alloc["安全性・法的"]);
    expect(alloc["プログラムデザイン"]).toBeGreaterThan(alloc["面談と評価"]);
  });

  it("本番155問の配分が概ね実配点に沿う", () => {
    const alloc = allocateByDomain(155, WEIGHTS);
    // 31% * 155 ≒ 48
    expect(alloc["エクササイズテクニック"]).toBeGreaterThanOrEqual(47);
    expect(alloc["エクササイズテクニック"]).toBeLessThanOrEqual(49);
    // 13% * 155 ≒ 20
    expect(alloc["安全性・法的"]).toBeGreaterThanOrEqual(19);
    expect(alloc["安全性・法的"]).toBeLessThanOrEqual(21);
  });

  it("total が 0 なら全分野 0", () => {
    const alloc = allocateByDomain(0, WEIGHTS);
    expect(Object.values(alloc).every((n) => n === 0)).toBe(true);
  });
});

function makeQuestions(): Question[] {
  const domains = Object.keys(WEIGHTS);
  const out: Question[] = [];
  for (const d of domains) {
    for (let i = 0; i < 10; i++) {
      out.push({
        id: `${d}-${i}`,
        domain: d,
        difficulty: 1,
        question: "?",
        choices: ["a", "b", "c"],
        answerIndex: 0,
        explanation: "",
        imageUrl: null,
        videoUrl: null,
        reference: { edition: "第3版", chapter: null, page: null },
      });
    }
  }
  return out;
}

describe("composeMock", () => {
  it("要求した問題数を構成する", () => {
    const questions = makeQuestions();
    const { questions: picked } = composeMock(questions, 30, WEIGHTS, () => 0.5);
    expect(picked).toHaveLength(30);
    // 重複なし
    expect(new Set(picked.map((p) => p.id)).size).toBe(30);
  });

  it("ある分野の在庫が足りなくても total を満たす（他分野から補充）", () => {
    // テクニックを2問しか用意しない
    const questions: Question[] = [
      ...makeQuestions().filter((q) => q.domain !== "エクササイズテクニック"),
      {
        id: "tech-a",
        domain: "エクササイズテクニック",
        difficulty: 1,
        question: "?",
        choices: ["a", "b", "c"],
        answerIndex: 0,
        explanation: "",
        imageUrl: null,
        videoUrl: null,
        reference: { edition: "第3版", chapter: null, page: null },
      },
      {
        id: "tech-b",
        domain: "エクササイズテクニック",
        difficulty: 1,
        question: "?",
        choices: ["a", "b", "c"],
        answerIndex: 0,
        explanation: "",
        imageUrl: null,
        videoUrl: null,
        reference: { edition: "第3版", chapter: null, page: null },
      },
    ];
    const { questions: picked, allocation } = composeMock(
      questions,
      30,
      WEIGHTS,
      () => 0.5,
    );
    expect(picked).toHaveLength(30);
    expect(allocation["エクササイズテクニック"].actual).toBeLessThanOrEqual(2);
  });
});

describe("timeLimitSeconds", () => {
  it("本番155問=180分に比例配分する", () => {
    // 155問なら 180*60 = 10800 秒
    expect(timeLimitSeconds(155)).toBe(10800);
    // 半分の問題数なら概ね半分の時間
    expect(timeLimitSeconds(31)).toBe(Math.round(10800 * (31 / 155)));
  });
});

describe("timerTone", () => {
  it("残り25%以下で warn、10%以下で danger", () => {
    expect(timerTone(100, 100)).toBe("normal");
    expect(timerTone(26, 100)).toBe("normal");
    expect(timerTone(25, 100)).toBe("warn");
    expect(timerTone(11, 100)).toBe("warn");
    expect(timerTone(10, 100)).toBe("danger");
    expect(timerTone(0, 100)).toBe("danger");
  });

  it("limit が 0 以下なら常に normal", () => {
    expect(timerTone(10, 0)).toBe("normal");
  });
});

describe("grade", () => {
  it("70%以上で合格", () => {
    const answers = [
      { domain: "A", correct: true },
      { domain: "A", correct: true },
      { domain: "B", correct: true },
      { domain: "B", correct: false },
    ];
    const r = grade(answers);
    expect(r.correct).toBe(3);
    expect(r.total).toBe(4);
    expect(r.rate).toBe(0.75);
    expect(r.passed).toBe(true);
  });

  it("70%未満は不合格", () => {
    const answers = [
      { domain: "A", correct: true },
      { domain: "A", correct: false },
      { domain: "A", correct: false },
    ];
    const r = grade(answers);
    expect(r.passed).toBe(false);
  });

  it("分野別内訳を返す", () => {
    const answers = [
      { domain: "A", correct: true },
      { domain: "A", correct: false },
      { domain: "B", correct: true },
    ];
    const r = grade(answers);
    const a = r.byDomain.find((d) => d.domain === "A")!;
    expect(a.total).toBe(2);
    expect(a.correct).toBe(1);
    expect(a.rate).toBe(0.5);
  });
});
