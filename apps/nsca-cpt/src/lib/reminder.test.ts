import { describe, it, expect } from "vitest";
import { buildDailyReminderIcs, isValidTime } from "./reminder";

describe("isValidTime", () => {
  it("HH:MM 形式を受理する", () => {
    expect(isValidTime("07:30")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("7:30")).toBe(false);
    expect(isValidTime("")).toBe(false);
  });
});

describe("buildDailyReminderIcs", () => {
  it("毎日繰り返し・指定時刻・アラーム付きのVEVENTを生成する", () => {
    const ics = buildDailyReminderIcs(
      "07:30",
      "https://example.com",
      new Date("2026-07-11T00:00:00"),
    );
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("DTSTART:20260711T073000");
    expect(ics).toContain("SUMMARY:NSCA-CPT 今日の3問");
    expect(ics).toContain("https://example.com");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("不正な時刻は例外を投げる", () => {
    expect(() => buildDailyReminderIcs("25:00")).toThrow();
  });
});
