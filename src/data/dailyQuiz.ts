import type { DailyQuiz, QuizHistory } from "../models/dailyQuiz";
import type { Sighting } from "../models/sighting";
import type { SpeciesSummary } from "../models/species";
import { buildRound, QUESTIONS_PER_ROUND } from "./quizRound";

export const FIRST_QUIZ_DATE = "2026-11-20";
export const NO_REPEAT_DAYS = 90;
export const QUIZ_TIME_ZONE = "America/New_York";
const EASTERN_UTC_OFFSETS_HOURS = [4, 5];
const DAYS_AHEAD = 2;
const DAY_MS = 24 * 60 * 60 * 1000;
const quizDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: QUIZ_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

interface QuizSources {
  sightings: Sighting[];
  index: SpeciesSummary[];
  random?: () => number;
}

export function quizDateAt(now: Date): string {
  return quizDateFormat.format(now);
}

export function nextQuizAt(now: Date): Date {
  const tomorrow = addDays(quizDateAt(now), 1);
  const [year, month, day] = tomorrow.split("-").map(Number) as [number, number, number];
  const midnight = EASTERN_UTC_OFFSETS_HOURS.map((hours) => new Date(Date.UTC(year, month - 1, day, hours))).find(
    (candidate) => quizDateAt(candidate) === tomorrow && quizDateAt(new Date(candidate.getTime() - 1)) !== tomorrow,
  );
  return midnight!;
}

export function quizDates(now: Date): string[] {
  const today = quizDateAt(now);
  return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i)).filter((date) => date >= FIRST_QUIZ_DATE);
}

export function scheduleQuizzes({
  dates,
  published,
  history,
  ...sources
}: QuizSources & { dates: string[]; published: DailyQuiz[]; history: QuizHistory }): { quizzes: DailyQuiz[]; history: QuizHistory } {
  let days = history.days;
  const quizzes = dates.map((date) => {
    const quiz = published.find((candidate) => candidate.date === date) ?? pickDailyQuiz({ date, history: { days }, ...sources });
    days = [...days.filter((day) => day.date !== date), { date, occurrenceIds: quiz.questions.map((question) => question.occurrenceId) }];
    return quiz;
  });
  const newest = dates.at(-1) ?? "";
  return {
    quizzes,
    history: { days: days.filter((day) => daysApart(day.date, newest) < NO_REPEAT_DAYS).sort((a, b) => a.date.localeCompare(b.date)) },
  };
}

export function pickDailyQuiz({ date, history, sightings, index, random }: QuizSources & { date: string; history: QuizHistory }): DailyQuiz {
  const used = new Set(
    history.days.filter((day) => day.date !== date && daysApart(day.date, date) < NO_REPEAT_DAYS).flatMap((day) => day.occurrenceIds),
  );
  const round = buildRound(
    sightings.filter((sighting) => !used.has(sighting.id)),
    index,
    random,
  );
  if (round.length < QUESTIONS_PER_ROUND) {
    throw new Error(`Only found ${round.length} unused photographed sightings for the ${date} quiz; need ${QUESTIONS_PER_ROUND}`);
  }
  return {
    date,
    number: quizNumber(date),
    questions: round.map(({ sighting, answer, choices }) => ({
      occurrenceId: sighting.id,
      speciesKey: answer.gbifKey,
      choices: choices.map((choice) => choice.gbifKey),
      photo: sighting.photo!,
      lat: sighting.lat,
      lng: sighting.lng,
      place: sighting.place,
      date: sighting.date,
    })),
  };
}

export function todaysQuiz<T extends { date: string }>(quizzes: T[], today: string): T | undefined {
  return quizzes.filter((quiz) => quiz.date <= today).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
}

export function quizNumber(date: string): number {
  return Math.round((Date.parse(date) - Date.parse(FIRST_QUIZ_DATE)) / DAY_MS) + 1;
}

function daysApart(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / DAY_MS;
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}
