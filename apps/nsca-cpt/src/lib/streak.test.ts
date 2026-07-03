import { describe, it, expect } from "vitest";
import {
  displayStreak,
  previousDateKey,
  updateStreak,
  dailyCounts,
} from "./streak";
import type { AnswerRecord, StreakState } from "./types";

const base: StreakState = { current: 0, longest: 0, lastStudyDate: null };

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

  it("間が空くと 1 にリセットされ、最長は保持される", () => {
    let s = updateStreak(base, "2026-07-03");
    s = updateStreak(s, "2026-07-04"); // current 2
    s = updateStreak(s, "2026-07-10"); // 間が空く
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
});

describe("displayStreak", () => {
  it("最終学習が今日または昨日なら現在値を表示", () => {
    const s: StreakState = { current: 3, longest: 5, lastStudyDate: "2026-07-02" };
    expect(displayStreak(s, "2026-07-03")).toBe(3); // 昨日
    expect(displayStreak(s, "2026-07-02")).toBe(3); // 今日
  });

  it("途切れていれば 0 を表示（保存値は変えない）", () => {
    const s: StreakState = { current: 3, longest: 5, lastStudyDate: "2026-06-30" };
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
