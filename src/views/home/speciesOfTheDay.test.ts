import { describe, expect, it } from "vitest";
import type { SpeciesSummary } from "../../models/species";
import { speciesOfTheDay } from "./speciesOfTheDay";

const species = (gbifKey: number, imageUrl?: string): SpeciesSummary => ({
  gbifKey,
  taxonName: `Taxon ${gbifKey}`,
  commonName: `Species ${gbifKey}`,
  category: "EN",
  order: "Primates",
  sightings: 1,
  imageUrl,
  subspecies: [],
});
const index = Array.from({ length: 30 }, (_, i) => species(i + 1, `https://example.org/${i}.jpg`));

describe("speciesOfTheDay", () => {
  it("picks the same species all day, in the visitor's own time zone", () => {
    expect(speciesOfTheDay(index, new Date(2026, 10, 19, 0, 1))).toBe(speciesOfTheDay(index, new Date(2026, 10, 19, 23, 59)));
  });

  it("picks a different species on the next day", () => {
    expect(speciesOfTheDay(index, new Date(2026, 10, 20))).not.toBe(speciesOfTheDay(index, new Date(2026, 10, 19)));
  });

  it("features every species once before repeating", () => {
    const month = Array.from({ length: index.length }, (_, day) => speciesOfTheDay(index, new Date(2026, 0, 1 + day)));
    expect(new Set(month).size).toBe(index.length);
  });

  it("only features species with a photo", () => {
    const mixed = [species(1), species(2, "https://example.org/2.jpg"), species(3)];
    expect(speciesOfTheDay(mixed, new Date(2026, 5, 1))?.gbifKey).toBe(2);
  });

  it("has nothing to feature without photos", () => {
    expect(speciesOfTheDay([species(1)], new Date())).toBeUndefined();
  });
});
