import { describe, expect, it } from "vitest";
import type { Sighting } from "../models/sighting";
import type { SpeciesSummary } from "../models/species";
import { buildRound, CHOICES_PER_QUESTION, QUESTIONS_PER_ROUND } from "./quizRound";

function species(gbifKey: number, commonName: string, order: SpeciesSummary["order"] = "Carnivora"): SpeciesSummary {
  return { gbifKey, taxonName: `Taxon ${gbifKey}`, commonName, category: "EN", order, sightings: 1, subspecies: [] };
}

function sighting(id: number, speciesKey: number, withPhoto = true): Sighting {
  return {
    id,
    speciesKey,
    scientificName: "",
    category: "EN",
    lat: 0,
    lng: 0,
    place: "",
    gbifUrl: "",
    photo: withPhoto ? { url: `https://example.org/${id}.jpg` } : undefined,
  };
}

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const index = [
  species(1, "Tiger"),
  species(2, "Lion"),
  species(3, "Snow leopard"),
  species(4, "Red panda"),
  species(5, "Dhole"),
  species(6, "Bornean orangutan", "Primates"),
  species(7, "Mountain gorilla", "Primates"),
  species(8, "Asian elephant", "Proboscidea"),
];

describe("buildRound", () => {
  it("asks about a different species in each question", () => {
    const sightings = index.flatMap((entry) => [sighting(entry.gbifKey * 10, entry.gbifKey), sighting(entry.gbifKey * 10 + 1, entry.gbifKey)]);
    const round = buildRound(sightings, index, seeded(1));
    expect(round).toHaveLength(QUESTIONS_PER_ROUND);
    expect(new Set(round.map((question) => question.answer.gbifKey)).size).toBe(QUESTIONS_PER_ROUND);
  });

  it("only asks about photographed sightings of species in the guide", () => {
    const round = buildRound([sighting(1, 1, false), sighting(2, 999), sighting(3, 2)], index, seeded(2));
    expect(round.map((question) => question.sighting.id)).toEqual([3]);
  });

  it("offers the answer among distinct choices, preferring relatives from the same order", () => {
    for (let seed = 1; seed < 20; seed += 1) {
      const [question] = buildRound([sighting(1, 1)], index, seeded(seed));
      const names = question!.choices.map((choice) => choice.commonName);
      expect(names).toContain("Tiger");
      expect(new Set(names).size).toBe(CHOICES_PER_QUESTION);
      expect(question!.choices.every((choice) => choice.order === "Carnivora")).toBe(true);
    }
  });

  it("fills the choices from other orders when the order is small", () => {
    const [question] = buildRound([sighting(1, 8)], index, seeded(3));
    expect(question!.choices).toHaveLength(CHOICES_PER_QUESTION);
    expect(question!.choices.map((choice) => choice.commonName)).toContain("Asian elephant");
  });

  it("never offers two choices with the same name", () => {
    const lookalikes = [...index, species(9, "Tiger"), species(10, "Lion")];
    for (let seed = 1; seed < 20; seed += 1) {
      const [question] = buildRound([sighting(1, 2)], lookalikes, seeded(seed));
      const names = question!.choices.map((choice) => choice.commonName);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
