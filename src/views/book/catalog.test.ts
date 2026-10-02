import { describe, expect, it } from "vitest";
import type { SpeciesSummary } from "../../models/species";
import { searchCatalog } from "./catalog";

function species(overrides: Partial<SpeciesSummary>): SpeciesSummary {
  return { gbifKey: 1, taxonName: "", commonName: "", category: "EN", order: "Carnivora", sightings: 1, subspecies: [], ...overrides };
}

const tiger = species({
  gbifKey: 1,
  taxonName: "Panthera tigris",
  commonName: "Tiger",
  subspecies: [
    { gbifKey: 7059276, taxonName: "Panthera tigris tigris", commonName: "Bengal tiger", sightings: 10 },
    { gbifKey: 5219418, taxonName: "Panthera tigris sumatrae", sightings: 10 },
  ],
});
const orangutan = species({ gbifKey: 2, taxonName: "Pongo pygmaeus", commonName: "Bornean orangutan", order: "Primates" });
const snowLeopard = species({ gbifKey: 3, taxonName: "Panthera uncia", commonName: "Snow leopard", category: "VU" });
const catalog = [orangutan, snowLeopard, tiger];

describe("searchCatalog", () => {
  it("returns everything for an empty or blank search", () => {
    expect(searchCatalog(catalog, "")).toEqual(catalog);
    expect(searchCatalog(catalog, "   ")).toEqual(catalog);
  });

  it("matches common and scientific names case-insensitively", () => {
    expect(searchCatalog(catalog, "ORANG")).toEqual([orangutan]);
    expect(searchCatalog(catalog, "panthera")).toEqual([snowLeopard, tiger]);
  });

  it("finds a species by the common or scientific name of one of its subspecies", () => {
    expect(searchCatalog(catalog, "bengal")).toEqual([tiger]);
    expect(searchCatalog(catalog, "sumatrae")).toEqual([tiger]);
  });

  it("returns nothing when no name matches", () => {
    expect(searchCatalog(catalog, "dodo")).toEqual([]);
  });
});
