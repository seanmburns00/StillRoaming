import { readFile, writeFile } from "node:fs/promises";
import "./politeFetch";
import { fetchSightings, PAGE_SIZE } from "../src/api/gbif";
import { SITE_URL } from "../src/config";
import { quizDates, scheduleQuizzes } from "../src/data/dailyQuiz";
import { sealHistory, sealQuiz, unsealHistory, unsealQuiz } from "../src/data/publishedQuiz";
import type { PublishedHistory, QuizSchedule } from "../src/models/dailyQuiz";
import { ALL_IUCN_CATEGORIES } from "../src/models/iucn";
import type { SpeciesIndex } from "../src/models/species";
import { defaultQuery } from "../src/views/map/query";

const PUBLIC = new URL("../public/", import.meta.url);
const QUIZ_FILE = "daily-quiz.json";
const HISTORY_FILE = "quiz-history.json";

async function published<T>(file: string): Promise<T | undefined> {
  const response = await fetch(new URL(file, SITE_URL)).catch(() => undefined);
  if (!response?.ok) {
    console.warn(`No published ${file} (${response?.status ?? "unreachable"}); starting fresh`);
    return undefined;
  }
  return (await response.json()) as T;
}

const [publishedSchedule, publishedHistory] = await Promise.all([published<QuizSchedule>(QUIZ_FILE), published<PublishedHistory>(HISTORY_FILE)]);
const { species } = JSON.parse(await readFile(new URL("species-index.json", PUBLIC), "utf8")) as SpeciesIndex;
const query = { ...defaultQuery(new Date()), categories: ALL_IUCN_CATEGORIES };
const { sightings } = await fetchSightings(query, new Map(species.map((entry) => [entry.gbifKey, entry])), undefined, PAGE_SIZE);

const { quizzes, history } = scheduleQuizzes({
  dates: quizDates(new Date()),
  published: await Promise.all((publishedSchedule?.quizzes ?? []).map(unsealQuiz)),
  history: publishedHistory ? await unsealHistory(publishedHistory) : { days: [] },
  sightings,
  index: species,
});

const schedule: QuizSchedule = { quizzes: await Promise.all(quizzes.map(sealQuiz)) };
await writeFile(new URL(QUIZ_FILE, PUBLIC), JSON.stringify(schedule));
await writeFile(new URL(HISTORY_FILE, PUBLIC), JSON.stringify(await sealHistory(history)));
console.log(`Scheduled quizzes #${quizzes[0]?.number}–#${quizzes.at(-1)?.number} (${quizzes[0]?.date} to ${quizzes.at(-1)?.date})`);
