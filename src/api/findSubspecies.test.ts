import { describe, expect, it } from "vitest";
import type { SpeciesSummary } from "../models/species";
import { findSubspecies } from "./speciesIndex";

const bengal = { gbifKey: 7059276, taxonName: "Panthera tigris tigris", commonName: "Bengal tiger", sightings: 2320 };
const tiger: SpeciesSummary = {
  gbifKey: 5219416,
  taxonName: "Panthera tigris",
  commonName: "Tiger",
  category: "EN",
  order: "Carnivora",
  sightings: 2785,
  subspecies: [bengal],
};
const lion: SpeciesSummary = { ...tiger, gbifKey: 5219404, commonName: "Lion", subspecies: [] };

describe("findSubspecies", () => {
  it("finds a subspecies with the species it belongs to", () => {
    expect(findSubspecies([lion, tiger], 7059276)).toEqual({ species: tiger, subspecies: bengal });
  });

  it("returns nothing for an unknown key, including a species key", () => {
    expect(findSubspecies([lion, tiger], 5219416)).toBeUndefined();
  });
});
