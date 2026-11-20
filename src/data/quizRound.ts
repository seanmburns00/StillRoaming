import type { Sighting } from "../models/sighting";
import type { SpeciesSummary } from "../models/species";
import { shuffle } from "../shuffle";

export const QUESTIONS_PER_ROUND = 5;
export const CHOICES_PER_QUESTION = 4;

export interface Question {
  sighting: Sighting;
  answer: SpeciesSummary;
  choices: SpeciesSummary[];
}

export function buildRound(sightings: Sighting[], index: SpeciesSummary[], random: () => number = Math.random): Question[] {
  const speciesByKey = new Map(index.map((species) => [species.gbifKey, species]));
  const questions: Question[] = [];
  for (const sighting of shuffle(sightings, random)) {
    const answer = speciesByKey.get(sighting.speciesKey);
    if (!sighting.photo || !answer || questions.some((question) => question.answer === answer)) continue;
    questions.push({ sighting, answer, choices: shuffle([answer, ...decoys(answer, index, random)], random) });
    if (questions.length === QUESTIONS_PER_ROUND) break;
  }
  return questions;
}

function decoys(answer: SpeciesSummary, index: SpeciesSummary[], random: () => number): SpeciesSummary[] {
  const others = index.filter((species) => species.commonName !== answer.commonName);
  const relatives = shuffle(others.filter((species) => species.order === answer.order), random);
  const strangers = shuffle(others.filter((species) => species.order !== answer.order), random);
  return uniqueNames([...relatives, ...strangers]).slice(0, CHOICES_PER_QUESTION - 1);
}

function uniqueNames(species: SpeciesSummary[]): SpeciesSummary[] {
  const seen = new Set<string>();
  return species.filter((entry) => {
    if (seen.has(entry.commonName)) return false;
    seen.add(entry.commonName);
    return true;
  });
}
