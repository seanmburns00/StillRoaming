// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { loadAnswers, saveAnswers } from "./progress";

const answer = { nameCorrect: true, guess: { lat: 1, lng: 2 }, km: 10, points: 995 };

describe("quiz progress", () => {
  beforeEach(() => localStorage.clear());

  it("restores today's answers", () => {
    saveAnswers("2026-11-20", [answer]);
    expect(loadAnswers("2026-11-20")).toEqual([answer]);
  });

  it("starts fresh on a new day", () => {
    saveAnswers("2026-11-20", [answer]);
    expect(loadAnswers("2026-11-21")).toEqual([]);
  });

  it("starts fresh when nothing or something unreadable is saved", () => {
    expect(loadAnswers("2026-11-20")).toEqual([]);
    localStorage.setItem("still-roaming-daily-quiz", "{not json");
    expect(loadAnswers("2026-11-20")).toEqual([]);
  });
});
