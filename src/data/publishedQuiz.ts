import type { DailyQuiz, PublishedHistory, PublishedQuiz, QuizAnswer, QuizHistory } from "../models/dailyQuiz";
import { seal, unseal } from "./sealing";

export async function sealQuiz({ date, number, questions }: DailyQuiz): Promise<PublishedQuiz> {
  return {
    date,
    number,
    questions: await Promise.all(
      questions.map(async ({ choices, photo, ...answer }) => ({ choices, photo, answer: await seal(answer satisfies QuizAnswer) })),
    ),
  };
}

export async function unsealQuiz({ date, number, questions }: PublishedQuiz): Promise<DailyQuiz> {
  return {
    date,
    number,
    questions: await Promise.all(
      questions.map(async ({ choices, photo, answer }) => ({ choices, photo, ...(await unseal<QuizAnswer>(answer)) })),
    ),
  };
}

export async function sealHistory(history: QuizHistory): Promise<PublishedHistory> {
  return { sealed: await seal(history) };
}

export function unsealHistory({ sealed }: PublishedHistory): Promise<QuizHistory> {
  return unseal<QuizHistory>(sealed);
}
