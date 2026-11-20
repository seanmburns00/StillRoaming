import { describe, expect, it } from "vitest";
import type { DailyQuiz, QuizHistory } from "../models/dailyQuiz";
import type { Sighting } from "../models/sighting";
import type { SpeciesSummary } from "../models/species";
import { FIRST_QUIZ_DATE, nextQuizAt, NO_REPEAT_DAYS, pickDailyQuiz, quizDateAt, quizDates, quizNumber, scheduleQuizzes, todaysQuiz } from "./dailyQuiz";
import { QUESTIONS_PER_ROUND } from "./quizRound";

const index: SpeciesSummary[] = Array.from({ length: 40 }, (_, i) => ({
  gbifKey: i + 1,
  taxonName: `Taxon ${i + 1}`,
  commonName: `Species ${i + 1}`,
  category: "EN",
  order: "Carnivora",
  sightings: 1,
  subspecies: [],
}));

const sighting = (id: number, speciesKey: number): Sighting => ({
  id,
  speciesKey,
  scientificName: "",
  category: "EN",
  lat: 10,
  lng: 20,
  place: "Kenya",
  date: "2026-11-01",
  gbifUrl: "",
  photo: { url: `https://example.org/${id}.jpg`, credit: "A. Ranger" },
});

const sightings = index.map((species) => sighting(species.gbifKey * 100, species.gbifKey));
const manySightings = index.flatMap((species) => Array.from({ length: 20 }, (_, i) => sighting(species.gbifKey * 100 + i, species.gbifKey)));
const empty: QuizHistory = { days: [] };
const ids = (quiz: DailyQuiz) => quiz.questions.map((question) => question.occurrenceId);

describe("quizDateAt", () => {
  it("is the date in Eastern Time, so everyone switches quiz at the same moment", () => {
    expect(quizDateAt(new Date("2026-11-20T04:59:00Z"))).toBe("2026-11-19");
    expect(quizDateAt(new Date("2026-11-20T05:00:00Z"))).toBe("2026-11-20");
    expect(quizDateAt(new Date("2026-07-05T03:59:00Z"))).toBe("2026-07-04");
    expect(quizDateAt(new Date("2026-07-05T04:00:00Z"))).toBe("2026-07-05");
  });
});

describe("nextQuizAt", () => {
  it("is midnight Eastern Standard Time in winter", () => {
    expect(nextQuizAt(new Date("2026-11-20T15:00:00Z")).toISOString()).toBe("2026-11-21T05:00:00.000Z");
  });

  it("is midnight Eastern Daylight Time in summer", () => {
    expect(nextQuizAt(new Date("2026-07-04T12:00:00Z")).toISOString()).toBe("2026-07-05T04:00:00.000Z");
  });

  it("handles the nights the clocks change", () => {
    expect(nextQuizAt(new Date("2026-03-07T20:00:00Z")).toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(nextQuizAt(new Date("2026-03-08T12:00:00Z")).toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(nextQuizAt(new Date("2026-10-31T16:00:00Z")).toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(nextQuizAt(new Date("2026-11-01T16:00:00Z")).toISOString()).toBe("2026-11-02T05:00:00.000Z");
  });

  it("is the following midnight one second after a new quiz starts", () => {
    expect(nextQuizAt(new Date("2026-11-21T05:00:01Z")).toISOString()).toBe("2026-11-22T05:00:00.000Z");
  });
});

describe("quizDates", () => {
  it("covers today to two days ahead in Eastern Time, so the next quiz is live even when the nightly build runs late", () => {
    expect(quizDates(new Date("2026-11-20T15:00:00Z"))).toEqual(["2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(quizDates(new Date("2026-11-21T03:00:00Z"))).toEqual(["2026-11-20", "2026-11-21", "2026-11-22"]);
  });

  it("crosses month and year ends", () => {
    expect(quizDates(new Date("2027-01-01T04:30:00Z"))).toEqual(["2026-12-31", "2027-01-01", "2027-01-02"]);
  });

  it("schedules nothing before the first quiz", () => {
    expect(quizDates(new Date("2026-11-19T15:00:00Z"))).toEqual(["2026-11-20", "2026-11-21"]);
  });
});

describe("pickDailyQuiz", () => {
  it("picks a full quiz with everything the page needs to play it", () => {
    const quiz = pickDailyQuiz({ date: "2026-11-25", sightings, index, history: empty });
    expect(quiz.date).toBe("2026-11-25");
    expect(quiz.number).toBe(quizNumber("2026-11-25"));
    expect(quiz.questions).toHaveLength(QUESTIONS_PER_ROUND);
    const [question] = quiz.questions;
    expect(question!.choices).toContain(question!.speciesKey);
    expect(question).toMatchObject({ lat: 10, lng: 20, place: "Kenya", date: "2026-11-01", photo: { credit: "A. Ranger" } });
    expect(question!.occurrenceId).toBe(question!.speciesKey * 100);
  });

  it("skips sightings used within 90 days on either side, including quizzes already scheduled ahead", () => {
    const history = {
      days: [
        { date: "2026-08-28", occurrenceIds: [100] },
        { date: "2026-11-26", occurrenceIds: [200] },
        { date: "2026-08-27", occurrenceIds: [300] },
      ],
    };
    const candidates = [100, 200, 300, 400, 500, 600, 700].map((id, i) => sighting(id, i + 1));
    const quiz = pickDailyQuiz({ date: "2026-11-25", sightings: candidates, index, history });
    expect(ids(quiz).sort()).toEqual([300, 400, 500, 600, 700]);
  });

  it("fails rather than publishing a short quiz, so every day has the same top score", () => {
    const history = { days: [{ date: "2026-11-24", occurrenceIds: sightings.slice(4).map((entry) => entry.id) }] };
    expect(() => pickDailyQuiz({ date: "2026-11-25", sightings, index, history })).toThrow("need 5");
  });
});

describe("scheduleQuizzes", () => {
  const dates = ["2026-11-20", "2026-11-21", "2026-11-22"];

  it("keeps quizzes already published, so a rebuild never changes a quiz people may have played", () => {
    const today = pickDailyQuiz({ date: "2026-11-20", sightings, index, history: empty });
    const { quizzes } = scheduleQuizzes({ dates, published: [today], history: empty, sightings, index });
    expect(quizzes[0]).toBe(today);
    expect(quizzes.map((quiz) => quiz.date)).toEqual(dates);
  });

  it("never repeats a sighting across the scheduled days", () => {
    const { quizzes } = scheduleQuizzes({ dates, published: [], history: empty, sightings, index });
    const all = quizzes.flatMap(ids);
    expect(new Set(all).size).toBe(all.length);
  });

  it("records every scheduled quiz and forgets days the no-repeat rule no longer needs", () => {
    const history = {
      days: [
        { date: "2026-08-24", occurrenceIds: [1] },
        { date: "2026-08-25", occurrenceIds: [2] },
      ],
    };
    const result = scheduleQuizzes({ dates, published: [], history, sightings, index });
    expect(result.history.days.map((day) => day.date)).toEqual(["2026-08-25", ...dates]);
    expect(result.history.days.at(-1)!.occurrenceIds).toEqual(ids(result.quizzes.at(-1)!));
  });

  it("stays the same size day after day", () => {
    let history = empty;
    let published: DailyQuiz[] = [];
    const sizes: number[] = [];
    for (let day = 0; day < 120; day += 1) {
      const result = scheduleQuizzes({ dates: quizDates(new Date(Date.UTC(2026, 10, 19 + day, 12))), published, history, sightings: manySightings, index });
      ({ history } = result);
      published = result.quizzes;
      sizes.push(history.days.length);
    }
    expect(Math.max(...sizes)).toBeLessThanOrEqual(NO_REPEAT_DAYS + 3);
  });
});

describe("todaysQuiz", () => {
  const quizzes = ["2026-11-19", "2026-11-20", "2026-11-21"].map((date) => ({ date, number: quizNumber(date), questions: [] }));

  it("finds today's quiz", () => {
    expect(todaysQuiz(quizzes, "2026-11-20")?.date).toBe("2026-11-20");
  });

  it("falls back to the newest earlier quiz when the build has stopped publishing", () => {
    expect(todaysQuiz(quizzes, "2026-11-25")?.date).toBe("2026-11-21");
  });

  it("has nothing before the first published quiz", () => {
    expect(todaysQuiz(quizzes, "2026-11-18")).toBeUndefined();
  });
});

describe("quizNumber", () => {
  it("counts from the first quiz", () => {
    expect(quizNumber(FIRST_QUIZ_DATE)).toBe(1);
    expect(quizNumber("2026-12-20")).toBe(31);
  });
});
