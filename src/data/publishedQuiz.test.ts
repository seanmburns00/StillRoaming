import { describe, expect, it } from "vitest";
import type { DailyQuiz } from "../models/dailyQuiz";
import { sealHistory, sealQuiz, unsealHistory, unsealQuiz } from "./publishedQuiz";

const quiz: DailyQuiz = {
  date: "2026-11-20",
  number: 2,
  questions: [
    {
      occurrenceId: 6869156558,
      speciesKey: 5219416,
      choices: [2435350, 5219416, 5219436, 5219530],
      photo: { url: "https://example.org/tiger.jpg", credit: "A. Ranger" },
      lat: 21.5432,
      lng: 79.2109,
      place: "Maharashtra, India",
      date: "2026-11-01",
    },
  ],
};

describe("sealQuiz", () => {
  it("round-trips a quiz", async () => {
    expect(await unsealQuiz(await sealQuiz(quiz))).toEqual(quiz);
  });

  it("keeps the photo and choices readable but hides the answer, the place and the sighting", async () => {
    const published = JSON.stringify(await sealQuiz(quiz));
    expect(published).toContain("https://example.org/tiger.jpg");
    expect(published).toContain("[2435350,5219416,5219436,5219530]");
    for (const secret of ['"speciesKey"', "6869156558", "21.5432", "79.2109", "Maharashtra", '"lat"']) {
      expect(published).not.toContain(secret);
    }
  });

  it("scrambles the same answer differently each time, so answers can't be matched across questions", async () => {
    const [first, second] = await Promise.all([sealQuiz(quiz), sealQuiz(quiz)]);
    expect(first.questions[0]!.answer).not.toBe(second.questions[0]!.answer);
  });

  it("refuses an answer that has been tampered with", async () => {
    const published = await sealQuiz(quiz);
    const answer = published.questions[0]!.answer;
    const tampered = { ...published, questions: [{ ...published.questions[0]!, answer: `${answer.slice(0, -4)}AAAA` }] };
    await expect(unsealQuiz(tampered)).rejects.toThrow();
  });
});

describe("sealHistory", () => {
  it("round-trips the history and hides the sighting ids", async () => {
    const history = { days: [{ date: "2026-11-20", occurrenceIds: [6869156558] }] };
    const published = await sealHistory(history);
    expect(JSON.stringify(published)).not.toContain("6869156558");
    expect(await unsealHistory(published)).toEqual(history);
  });
});
