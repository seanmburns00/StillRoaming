import type { SpeciesIndex, SpeciesSummary, SubspeciesSummary } from "../models/species";
import { getJson } from "./http";

let indexRequest: Promise<SpeciesSummary[]> | undefined;

export function fetchSpeciesIndex(): Promise<SpeciesSummary[]> {
  indexRequest ??= getJson<SpeciesIndex>(`${import.meta.env.BASE_URL}species-index.json`)
    .then((index) => index.species)
    .catch((error: unknown) => {
      indexRequest = undefined;
      throw error;
    });
  return indexRequest;
}

export function findSubspecies(
  index: SpeciesSummary[],
  subspeciesKey: number,
): { species: SpeciesSummary; subspecies: SubspeciesSummary } | undefined {
  for (const species of index) {
    const subspecies = species.subspecies.find((entry) => entry.gbifKey === subspeciesKey);
    if (subspecies) return { species, subspecies };
  }
  return undefined;
}
