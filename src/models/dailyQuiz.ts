import type { Photo } from "./sighting";

export interface QuizAnswer {
  occurrenceId: number;
  speciesKey: number;
  lat: number;
  lng: number;
  place: string;
  date?: string;
}

export interface DailyQuestion extends QuizAnswer {
  choices: number[];
  photo: Photo;
}

export interface DailyQuiz {
  date: string;
  number: number;
  questions: DailyQuestion[];
}

export interface QuizHistory {
  days: { date: string; occurrenceIds: number[] }[];
}

export interface PublishedQuestion {
  choices: number[];
  photo: Photo;
  answer: string;
}

export interface PublishedQuiz {
  date: string;
  number: number;
  questions: PublishedQuestion[];
}

export interface QuizSchedule {
  quizzes: PublishedQuiz[];
}

export interface PublishedHistory {
  sealed: string;
}
