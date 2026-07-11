import { describe, it, expect } from "vitest";
import {
  levelFromXp,
  milestoneInfo,
  masteredCount,
  almostMasteredCount,
  xpForLevel,
  MILESTONES,
} from "./progression";
import { createCard } from "./leitner";
import type { LeitnerCard } from "./types";

describe("xpForLevel / levelFromXp", () => {
  it("レベル閾値が単調増加する", () => {
    for (let l = 1; l < 20; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
    }
  });

  it("0問はレベル1", () => {
    const info = levelFromXp(0);
    expect(info.level).toBe(1);
    expect(info.remaining).toBe(5); // Lv2 は5問
  });

  it("5問でレベル2に上がる", () => {
    expect(levelFromXp(4).level).toBe(1);
    expect(levelFromXp(5).level).toBe(2);
    expect(levelFromXp(15).level).toBe(3);
    expect(levelFromXp(30).level).toBe(4);
  });

  it("progress は 0〜1 に収まる", () => {
    for (const xp of [0, 3, 5, 12, 100, 999]) {
      const p = levelFromXp(xp).progress;
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1.0001);
    }
  });
});

describe("milestoneInfo", () => {
  it("未達成なら next が最初のマイルストーン", () => {
    const m = milestoneInfo(0);
    expect(m.reached).toBeNull();
    expect(m.next).toBe(MILESTONES[0]);
  });

  it("途中の値で reached / next が正しい", () => {
    const m = milestoneInfo(60);
    expect(m.reached).toBe(50);
    expect(m.next).toBe(100);
    expect(m.progress).toBeCloseTo((60 - 50) / 50);
  });

  it("全達成で next は null・progress は 1", () => {
    const m = milestoneInfo(99999);
    expect(m.next).toBeNull();
    expect(m.progress).toBe(1);
  });
});

describe("masteredCount / almostMasteredCount", () => {
  const cards: Record<string, LeitnerCard> = {
    a: { ...createCard("a"), box: 5 },
    b: { ...createCard("b"), box: 4 },
    c: { ...createCard("c"), box: 3 },
    d: { ...createCard("d"), box: 3 },
    e: { ...createCard("e"), box: 1 },
  };

  it("ボックス4以上を定着として数える", () => {
    expect(masteredCount(cards)).toBe(2);
  });

  it("ボックス3を「もうすぐ定着」として数える", () => {
    expect(almostMasteredCount(cards)).toBe(2);
  });
});
