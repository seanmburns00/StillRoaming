import { afterEach, describe, expect, it, vi } from "vitest";
import type { OccurrenceSearch, Predicate } from "../api/gbif";
import { buildSpeciesIndex, mergeSpecies, type IndexSources } from "./buildSpeciesIndex";

const TIGER = 5219416;
const BENGAL = 7059276;
const SIBERIAN = 5219420;
const LEMUR = 8303093;
const SHEEP = 2441110;

function counts(bySpecies: Record<number, number>, byTaxon: Record<number, number> = {}) {
  const toMap = (record: Record<number, number>) => new Map(Object.entries(record).map(([key, count]) => [Number(key), count]));
  return { bySpecies: toMap(bySpecies), byTaxon: toMap(byTaxon) };
}

function sources(overrides: Partial<IndexSources> = {}): IndexSources {
  return {
    statuses: new Map([
      [TIGER, "EN"],
      [LEMUR, "CR"],
    ]),
    subspecies: [
      { key: SIBERIAN, speciesKey: TIGER, canonicalName: "Panthera tigris altaica" },
      { key: BENGAL, speciesKey: TIGER, canonicalName: "Panthera tigris tigris" },
    ],
    countsByOrder: [
      { order: "Carnivora", counts: counts({ [TIGER]: 2785 }, { [BENGAL]: 2320, [SIBERIAN]: 227 }) },
      { order: "Primates", counts: counts({ [LEMUR]: 3 }) },
    ],
    wikidata: new Map([
      [TIGER, { taxonName: "Panthera tigris", commonName: "tiger", imageUrl: "https://img/tiger" }],
      [BENGAL, { taxonName: "Panthera tigris tigris", commonName: "Bengal tiger" }],
    ]),
    gbifTaxa: new Map([[LEMUR, { canonicalName: "Lepilemur jamesi", vernacularName: "James' Sportive Lemur" }]]),
    ...overrides,
  };
}

describe("mergeSpecies", () => {
  it("combines GBIF status, order, counts and subspecies with Wikidata names and photos", () => {
    const tiger = mergeSpecies(sources()).find((species) => species.gbifKey === TIGER);
    expect(tiger).toEqual({
      gbifKey: TIGER,
      taxonName: "Panthera tigris",
      commonName: "Tiger",
      category: "EN",
      order: "Carnivora",
      sightings: 2785,
      imageUrl: "https://img/tiger",
      subspecies: [
        { gbifKey: BENGAL, taxonName: "Panthera tigris tigris", commonName: "Bengal tiger", sightings: 2320 },
        { gbifKey: SIBERIAN, taxonName: "Panthera tigris altaica", commonName: undefined, sightings: 227 },
      ],
    });
  });

  it("lists the most-sighted subspecies first", () => {
    const tiger = mergeSpecies(sources()).find((species) => species.gbifKey === TIGER);
    expect(tiger?.subspecies.map((entry) => entry.gbifKey)).toEqual([BENGAL, SIBERIAN]);
  });

  it("falls back to GBIF names for species Wikidata does not know", () => {
    expect(mergeSpecies(sources()).find((species) => species.gbifKey === LEMUR)).toMatchObject({
      taxonName: "Lepilemur jamesi",
      commonName: "James' Sportive Lemur",
      order: "Primates",
      subspecies: [],
    });
  });

  it("drops counted species that have no tracked status or no name", () => {
    const merged = mergeSpecies(
      sources({ countsByOrder: [{ order: "Carnivora", counts: counts({ [TIGER]: 1, 999: 5 }) }], gbifTaxa: new Map() }),
    );
    expect(merged.map((species) => species.gbifKey)).toEqual([TIGER]);
  });

  it("sorts by common name", () => {
    expect(mergeSpecies(sources()).map((species) => species.commonName)).toEqual(["James' Sportive Lemur", "Tiger"]);
  });
});

describe("buildSpeciesIndex", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function taxonKeys(predicate: Predicate): string[] {
    if (predicate.type === "in" && predicate.key === "TAXON_KEY") return predicate.values;
    return predicate.type === "and" || predicate.type === "or" ? predicate.predicates.flatMap(taxonKeys) : [];
  }

  function stubApis() {
    const facetResponse = (fields: Record<string, Record<string, number>>) =>
      new Response(
        JSON.stringify({
          count: 0,
          results: [],
          facets: Object.entries(fields).map(([field, values]) => ({
            field,
            counts: Object.entries(values).map(([name, count]) => ({ name, count })),
          })),
        }),
      );

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("https://query.wikidata.org")) {
        return new Response(
          JSON.stringify({
            results: { bindings: [{ gbifKey: { value: String(TIGER) }, taxonName: { value: "Panthera tigris" }, label: { value: "tiger" } }] },
          }),
        );
      }
      if (url.includes("/species/search")) {
        const order = new URL(url).searchParams.get("highertaxonKey");
        const results = order === "732" ? [{ key: BENGAL, speciesKey: TIGER, canonicalName: "Panthera tigris tigris" }] : [];
        return new Response(JSON.stringify({ endOfRecords: true, results }));
      }
      if (url.startsWith("https://api.gbif.org/v1/species/")) {
        return new Response(JSON.stringify({ canonicalName: "Lepilemur jamesi" }));
      }

      const search = JSON.parse(String(init?.body)) as OccurrenceSearch;
      if (search.facets?.includes("TAXON_KEY")) {
        const keys = taxonKeys(search.predicate);
        if (keys.includes("732")) return facetResponse({ SPECIES_KEY: { [TIGER]: 2785, [SHEEP]: 4 }, TAXON_KEY: { [BENGAL]: 2320 } });
        if (keys.includes("798")) return facetResponse({ SPECIES_KEY: { [LEMUR]: 3 }, TAXON_KEY: {} });
        return facetResponse({ SPECIES_KEY: {}, TAXON_KEY: {} });
      }
      const rated = JSON.stringify(search.predicate);
      if (rated.includes('"values":["EN"]')) return facetResponse({ SPECIES_KEY: { [TIGER]: 195 } });
      if (rated.includes('"values":["CR"]')) return facetResponse({ SPECIES_KEY: { [LEMUR]: 3 } });
      if (rated.includes('"values":["VU"]')) return facetResponse({ SPECIES_KEY: { [SHEEP]: 4 } });
      return facetResponse({ SPECIES_KEY: {} });
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("builds the published species list", async () => {
    stubApis();
    const index = await buildSpeciesIndex(new Date("2026-10-02T06:00:00Z"));

    expect(index.generatedAt).toBe("2026-10-02T06:00:00.000Z");
    expect(index.species.map(({ gbifKey, category, sightings }) => ({ gbifKey, category, sightings }))).toEqual([
      { gbifKey: LEMUR, category: "CR", sightings: 3 },
      { gbifKey: TIGER, category: "EN", sightings: 2785 },
    ]);
    expect(index.species.find((species) => species.gbifKey === TIGER)?.subspecies.map((entry) => entry.gbifKey)).toEqual([BENGAL]);
  });

  it("leaves out domestic animals even when some of their records carry a threatened status", async () => {
    const fetchMock = stubApis();
    const index = await buildSpeciesIndex();

    expect(index.species.map((species) => species.gbifKey)).not.toContain(SHEEP);
    const sightingSearches = fetchMock.mock.calls
      .filter(([url]) => url.endsWith("/occurrence/search/predicate"))
      .map(([, init]) => JSON.parse(String(init?.body)) as OccurrenceSearch)
      .filter((search) => search.facets?.includes("TAXON_KEY"));
    expect(sightingSearches).toHaveLength(10);
    for (const search of sightingSearches) {
      expect(taxonKeys(search.predicate)).not.toContain(String(SHEEP));
    }
  });

  it("only looks up GBIF names for species Wikidata does not know", async () => {
    const fetchMock = stubApis();
    await buildSpeciesIndex();
    const lookups = fetchMock.mock.calls.map(([url]) => url).filter((url) => /\/v1\/species\/\d+$/.test(url));
    expect(lookups).toEqual([`https://api.gbif.org/v1/species/${LEMUR}`]);
  });
});
