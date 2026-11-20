import type { Answer } from "./scoring";

const STORAGE_KEY = "still-roaming-daily-quiz";

interface SavedProgress {
  date: string;
  answers: Answer[];
}

export function loadAnswers(date: string): Answer[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as SavedProgress | null;
    return saved?.date === date && Array.isArray(saved.answers) ? saved.answers : [];
  } catch {
    return [];
  }
}

export function saveAnswers(date: string, answers: Answer[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, answers } satisfies SavedProgress));
  } catch {
    // Progress still counts for this visit.
  }
}
