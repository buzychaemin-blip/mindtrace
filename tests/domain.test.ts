import { describe, it, expect } from "vitest";
import {
  makeEmpty,
  makeDemo,
  startTimer,
  pauseTimer,
  resumeTimer,
  finishTimer,
  timerElapsed,
  saveBlock,
  blockFromTimes,
  atTime,
  dailyStudy,
  insights,
  wellbeing,
  saveUsage,
  removeSubject,
  csvExport,
  weeklyCsv,
  switchPhase,
  validateData,
  saveSubject,
  dayKey,
  addDays,
} from "../src/domain";
describe("timestamp timer", () => {
  it("restores a running timer and excludes pause intervals", () => {
    let d = makeEmpty();
    startTimer(d, "math", "stopwatch", 25, 5, 1000);
    expect(timerElapsed(d.active!, 11000)).toBe(10);
    d = JSON.parse(JSON.stringify(d));
    expect(timerElapsed(d.active!, 21000)).toBe(20);
    pauseTimer(d, 21000);
    expect(timerElapsed(d.active!, 90000)).toBe(20);
    resumeTimer(d, 100000);
    finishTimer(d, "manual", 110000);
    expect(d.sessions[0].durationSec).toBe(30);
    expect(d.sessions[0].segments).toHaveLength(2);
  });
  it("does not save a session twice or start duplicates", () => {
    const d = makeEmpty();
    startTimer(d, "math", "stopwatch", 25, 5, 1000);
    expect(() => startTimer(d, "math", "stopwatch")).toThrow();
    finishTimer(d, "manual", 11000);
    finishTimer(d, "manual", 12000);
    expect(d.sessions).toHaveLength(1);
  });
  it("rejects backward clock changes and an active subject archive", () => {
    const d = makeEmpty();
    startTimer(d, "math", "stopwatch", 25, 5, 1000);
    expect(() => pauseTimer(d, 0)).toThrow("기기 시각");
    expect(() => removeSubject(d, "math")).toThrow();
    expect(timerElapsed(d.active!, 0)).toBe(0);
  });
  it("splits pomodoro study and rest records", () => {
    const d = makeEmpty();
    startTimer(d, "math", "pomodoro", 25, 5, 1000);
    switchPhase(d, "manual", 61000);
    expect(d.sessions[0].kind).toBe("study");
    expect(d.active!.phase).toBe("rest");
    finishTimer(d, "manual", 121000);
    expect(d.sessions[1].kind).toBe("rest");
  });
  it("caps a background pomodoro and refuses resuming a completed phase", () => {
    const d = makeEmpty();
    startTimer(d, "math", "pomodoro", 1, 1, 1000);
    expect(timerElapsed(d.active!, 999999)).toBe(60);
    pauseTimer(d, 999999);
    expect(() => resumeTimer(d, 1000000)).toThrow("정한 시간");
    finishTimer(d, "manual", 1000000);
    expect(d.sessions[0].durationSec).toBe(60);
    expect(d.sessions[0].segments[0].end).toBe(61000);
  });
  it("allocates actual intervals across midnight, excluding pauses", () => {
    const d = makeEmpty(),
      day = "2026-10-17";
    startTimer(d, "math", "stopwatch", 25, 5, atTime(day, "23:50"));
    pauseTimer(d, atTime(day, "23:55"));
    resumeTimer(d, atTime("2026-10-18", "00:05"));
    finishTimer(d, "manual", atTime("2026-10-18", "00:10"));
    expect(dailyStudy(d, day)).toBe(5);
    expect(dailyStudy(d, "2026-10-18")).toBe(5);
  });
});
describe("planner and validated inputs", () => {
  it("supports 23:50–00:10 and rejects overlaps/non ten minute increments", () => {
    const d = makeEmpty();
    const b = {
      id: "b",
      title: "계획",
      subjectId: "math",
      ...blockFromTimes("2026-10-17", "23:50", "00:10"),
      source: "manual" as const,
    };
    saveBlock(d, b);
    expect((d.blocks[0].end - d.blocks[0].start) / 60000).toBe(20);
    expect(() => saveBlock(d, { ...b, id: "second" })).toThrow("겹쳐");
    expect(() =>
      saveBlock(d, { ...b, id: "bad", start: b.start + 60000 }),
    ).toThrow("10분");
  });
  it("archives subjects without losing historic sessions", () => {
    const d = makeEmpty();
    startTimer(d, "math", "stopwatch", 25, 5, 1000);
    finishTimer(d, "manual", 11000);
    removeSubject(d, "math");
    expect(d.subjects[0].archived).toBe(true);
    expect(d.sessions).toHaveLength(1);
    expect(() => startTimer(d, "math", "stopwatch")).toThrow();
  });
  it("rejects empty subjects, invalid usage minutes and future timestamps", () => {
    const d = makeEmpty();
    expect(() =>
      saveSubject(d, { id: "x", name: " ", color: "#ffffff" }),
    ).toThrow();
    const u = {
      id: "u",
      app: "SNS",
      at: Date.now(),
      minutes: -1,
      reason: "기타",
      source: "manual" as const,
    };
    expect(() => saveUsage(d, u)).toThrow();
    expect(() =>
      saveUsage(d, { ...u, minutes: 10, at: Date.now() + 3600000 }),
    ).toThrow("미래");
  });
});
describe("explainable analysis", () => {
  it("exports the comparison period, algorithm and missing-data status", () => {
    const report = weeklyCsv(makeEmpty(), "2026-10-17");
    expect(report).toContain("2026-10-11");
    expect(report).toContain("2026-10-17");
    expect(report).toContain("rule-v1.0");
    expect(report).toContain("자료 없음");
    expect(report).toContain("인과관계");
  });
  it("does not invent insights or a zero score for missing data", () => {
    const d = makeEmpty();
    expect(insights(d)).toEqual([]);
    expect(wellbeing(d).score).toBeNull();
    expect(wellbeing(d).coverage).toBe(0);
  });
  it("reweights only recorded components", () => {
    const d = makeEmpty();
    d.routines.push({ day: dayKey(), restCount: 3, sleepMet: null });
    const w = wellbeing(d);
    expect(w.score).toBe(100);
    expect(w.coverage).toBe(25);
    expect(w.parts).toHaveLength(1);
  });
  it("changes recommendations when user enters long use", () => {
    const d = makeEmpty();
    saveUsage(d, {
      id: "u",
      app: "영상",
      at: Date.now(),
      minutes: 45,
      reason: "습관적으로",
      source: "manual",
    });
    expect(insights(d).find((i) => i.id === "long-use")?.evidence).toContain(
      "1회",
    );
  });
  it("uses previous and current data and labels the version", () => {
    const d = makeDemo();
    const w = wellbeing(d);
    expect(w.score).not.toBeNull();
    expect(w.coverage).toBe(100);
    expect(w.current.unplannedMinutes).toBeLessThan(
      w.previous.unplannedMinutes,
    );
    expect(w.version).toBe("rule-v1.0");
  });
  it("does not award additional points for excessive study", () => {
    const d = makeDemo();
    const before = wellbeing(d).score;
    d.sessions.forEach((s) => (s.durationSec *= 5));
    expect(wellbeing(d).score).toBe(before);
  });
  it("escapes spreadsheet formulas in export", () => {
    const d = makeEmpty();
    d.usage.push({
      id: "u",
      app: "=CMD()",
      at: Date.now(),
      minutes: 1,
      reason: "기타",
      source: "manual",
    });
    expect(csvExport(d)).toContain("'=CMD()");
  });
  it("rejects malformed persisted data", () => {
    expect(() => validateData({ version: 9 })).toThrow();
    expect(() => validateData({ ...makeEmpty(), usage: null })).toThrow();
    expect(validateData(makeEmpty()).version).toBe(1);
  });
  it("rejects nested malformed backup values before rendering", () => {
    const d = makeEmpty();
    d.sessions = [{ id: "invalid" } as any];
    expect(() => validateData(d)).toThrow("올바르지");
    const e = makeEmpty();
    e.profile.goal = NaN;
    expect(() => validateData(e)).toThrow("올바르지");
  });
});
