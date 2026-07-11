import { describe, it, expect } from "vitest";
import {
  displayStreak,
  isStreakProtected,
  previousDateKey,
  updateStreak,
  dailyCounts,
  MAX_FREEZES,
} from "./streak";
import type { AnswerRecord, StreakState } from "./types";

const base: StreakState = {
  current: 0,
  longest: 0,
  lastStudyDate: null,
  freezes: 0,
};

describe("previousDateKey", () => {
  it("前日を返す（月またぎ）", () => {
    expect(previousDateKey("2026-03-01")).toBe("2026-02-28");
  });
});

describe("updateStreak", () => {
  it("初回学習で 1 になる", () => {
    const s = updateStreak(base, "2026-07-03");
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
  });

  it("連続した翌日で加算される", () => {
    let s = updateStreak(base, "2026-07-03");
    s = updateStreak(s, "2026-07-04");
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });

  it("同日中の再学習では変わらない", () => {
    let s = updateStreak(base, "2026-07-03");
    s = updateStreak(s, "2026-07-03");
    expect(s.current).toBe(1);
  });

  it("保護なしで間が空くと 1 にリセットされ、最長は保持される", () => {
    let s = updateStreak(base, "2026-07-03");
    s = updateStreak(s, "2026-07-04"); // current 2
    s = updateStreak(s, "2026-07-10"); // 間が空く
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
});

describe("ストリーク保護（おやすみ）", () => {
  it("1日休みでも保護があればチェーンが繋がり、保護を消費する", () => {
    const s: StreakState = {
      current: 5,
      longest: 5,
      lastStudyDate: "2026-07-01",
      freezes: 1,
    };
    // 7/2 を休んで 7/3 に学習
    const next = updateStreak(s, "2026-07-03");
    expect(next.current).toBe(6);
    expect(next.freezes).toBe(0);
  });

  it("保護がなければ1日休みでリセットされる", () => {
    const s: StreakState = {
      current: 5,
      longest: 5,
      lastStudyDate: "2026-07-01",
      freezes: 0,
    };
    const next = updateStreak(s, "2026-07-03");
    expect(next.current).toBe(1);
  });

  it("2日以上休むと保護があってもリセットされる（保護は消費しない）", () => {
    const s: StreakState = {
      current: 5,
      longest: 5,
      lastStudyDate: "2026-07-01",
      freezes: 1,
    };
    const next = updateStreak(s, "2026-07-05");
    expect(next.current).toBe(1);
    expect(next.freezes).toBe(1);
  });

  it("7日継続ごとに保護を1つ獲得する（上限 MAX_FREEZES）", () => {
    let s: StreakState = { ...base };
    // 7/1 から14日連続で学習
    for (let d = 1; d <= 14; d++) {
      s = updateStreak(s, `2026-07-${String(d).padStart(2, "0")}`);
    }
    expect(s.current).toBe(14);
    expect(s.freezes).toBe(2); // 7日目と14日目で獲得
    expect(s.freezes).toBeLessThanOrEqual(MAX_FREEZES);
  });
});

describe("displayStreak / isStreakProtected", () => {
  it("最終学習が今日または昨日なら現在値を表示", () => {
    const s: StreakState = {
      current: 3,
      longest: 5,
      lastStudyDate: "2026-07-02",
      freezes: 0,
    };
    expect(displayStreak(s, "2026-07-03")).toBe(3); // 昨日
    expect(displayStreak(s, "2026-07-02")).toBe(3); // 今日
  });

  it("一昨日でも保護があれば現在値を表示し、保護中と判定される", () => {
    const s: StreakState = {
      current: 5,
      longest: 5,
      lastStudyDate: "2026-07-01",
      freezes: 1,
    };
    expect(displayStreak(s, "2026-07-03")).toBe(5);
    expect(isStreakProtected(s, "2026-07-03")).toBe(true);
  });

  it("保護がなければ一昨日で 0 表示", () => {
    const s: StreakState = {
      current: 5,
      longest: 5,
      lastStudyDate: "2026-07-01",
      freezes: 0,
    };
    expect(displayStreak(s, "2026-07-03")).toBe(0);
    expect(isStreakProtected(s, "2026-07-03")).toBe(false);
  });

  it("途切れていれば 0 を表示（保存値は変えない）", () => {
    const s: StreakState = {
      current: 3,
      longest: 5,
      lastStudyDate: "2026-06-28",
      freezes: 1,
    };
    expect(displayStreak(s, "2026-07-03")).toBe(0);
  });
});

describe("dailyCounts", () => {
  it("直近7日分のバケットを作り、日ごとに集計する", () => {
    const today = new Date("2026-07-03T12:00:00");
    const answers: AnswerRecord[] = [
      {
        questionId: "a",
        domain: "面談と評価",
        correct: true,
        chosenIndex: 0,
        timestamp: new Date("2026-07-03T09:00:00").getTime(),
        mode: "practice",
      },
      {
        questionId: "b",
        domain: "面談と評価",
        correct: false,
        chosenIndex: 1,
        timestamp: new Date("2026-07-03T10:00:00").getTime(),
        mode: "practice",
      },
    ];
    const buckets = dailyCounts(answers, 7, today);
    expect(buckets).toHaveLength(7);
    const last = buckets[buckets.length - 1];
    expect(last.date).toBe("2026-07-03");
    expect(last.count).toBe(2);
    expect(last.correct).toBe(1);
  });
});
