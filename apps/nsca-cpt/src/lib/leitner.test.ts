import { describe, it, expect } from "vitest";
import {
  applyAnswer,
  createCard,
  orderByPriority,
  selectionWeight,
  selectQuestions,
  wrongNoteIds,
} from "./leitner";
import { NUM_BOXES } from "./config";
import type { LeitnerCard, Question } from "./types";

function q(id: string): Question {
  return {
    id,
    domain: "エクササイズテクニック",
    difficulty: 1,
    question: "?",
    choices: ["a", "b", "c"],
    answerIndex: 0,
    explanation: "",
    imageUrl: null,
    videoUrl: null,
    reference: { edition: "第3版", chapter: null, page: null },
  };
}

describe("applyAnswer", () => {
  it("正解でボックスが1つ上がる", () => {
    const card = createCard("x");
    const next = applyAnswer(card, true, 1000);
    expect(next.box).toBe(2);
    expect(next.correctCount).toBe(1);
    expect(next.lastCorrect).toBe(true);
    expect(next.lastSeen).toBe(1000);
  });

  it("不正解でボックス1に戻る", () => {
    let card = createCard("x");
    card = applyAnswer(card, true, 1); // box2
    card = applyAnswer(card, true, 2); // box3
    const next = applyAnswer(card, false, 3);
    expect(next.box).toBe(1);
    expect(next.wrongCount).toBe(1);
    expect(next.lastCorrect).toBe(false);
  });

  it("正解を重ねてもボックスは NUM_BOXES を超えない", () => {
    let card = createCard("x");
    for (let i = 0; i < 20; i++) card = applyAnswer(card, true, i);
    expect(card.box).toBe(NUM_BOXES);
  });

  it("元のカードを破壊しない（純粋関数）", () => {
    const card = createCard("x");
    applyAnswer(card, true, 1);
    expect(card.box).toBe(1);
  });
});

describe("selectionWeight", () => {
  it("未出題は高い優先度", () => {
    expect(selectionWeight(undefined)).toBe(NUM_BOXES);
  });

  it("低いボックス（苦手）ほど重みが大きい", () => {
    const box1: LeitnerCard = { ...createCard("a"), box: 1, lastSeen: 1 };
    const box5: LeitnerCard = { ...createCard("b"), box: 5, lastSeen: 1 };
    expect(selectionWeight(box1)).toBeGreaterThan(selectionWeight(box5));
  });
});

describe("selectQuestions", () => {
  it("要求数だけ、重複なく選ぶ", () => {
    const questions = [q("a"), q("b"), q("c"), q("d")];
    const picked = selectQuestions(questions, {}, 3, () => 0.5);
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((p) => p.id)).size).toBe(3);
  });

  it("問題数より多く要求しても全問返すだけ", () => {
    const questions = [q("a"), q("b")];
    const picked = selectQuestions(questions, {}, 10, () => 0.1);
    expect(picked).toHaveLength(2);
  });

  it("苦手（box1）の問題が定着済み（box5）より高頻度で選ばれる", () => {
    const questions = [q("weak"), q("strong")];
    const cards: Record<string, LeitnerCard> = {
      weak: { ...createCard("weak"), box: 1, lastSeen: 1 },
      strong: { ...createCard("strong"), box: 5, lastSeen: 1 },
    };
    // 決定的な擬似乱数で多数回抽選し、頻度を比較する。
    let seed = 12345;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    let weakFirst = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const picked = selectQuestions(questions, cards, 1, rng);
      if (picked[0].id === "weak") weakFirst++;
    }
    // 重み 5 : 1 なので weak が明確に多いはず。
    expect(weakFirst).toBeGreaterThan(trials * 0.6);
  });
});

describe("orderByPriority", () => {
  it("苦手を先頭に並べる", () => {
    const questions = [q("a"), q("b"), q("c")];
    const cards: Record<string, LeitnerCard> = {
      a: { ...createCard("a"), box: 5, lastSeen: 10 },
      b: { ...createCard("b"), box: 1, lastSeen: 10 },
      // c は未出題
    };
    const ordered = orderByPriority(questions, cards);
    // b(box1) と c(未出題) が a(box5) より前
    expect(ordered.map((o) => o.id).indexOf("a")).toBe(2);
  });
});

describe("wrongNoteIds", () => {
  it("直近で誤答した問題だけを新しい順で返す", () => {
    const cards: Record<string, LeitnerCard> = {
      a: { ...createCard("a"), lastCorrect: false, lastSeen: 100 },
      b: { ...createCard("b"), lastCorrect: true, lastSeen: 200 },
      c: { ...createCard("c"), lastCorrect: false, lastSeen: 300 },
    };
    expect(wrongNoteIds(cards)).toEqual(["c", "a"]);
  });
});
