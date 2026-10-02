import { afterEach, describe, expect, it, vi } from "vitest";
import type { OccurrenceSearch, Predicate } from "../api/gbif";
import { ALL_IUCN_CATEGORIES } from "../models/iucn";
import { fetchGbifTaxon, fetchSightingCounts, fetchSpeciesStatuses, fetchSubspecies } from "./gbifSpecies";

function facets(fields: Record<string, Record<string, number>>): Response {
  return new Response(
    JSON.stringify({
      count: 0,
      results: [],
      facets: Object.entries(fields).map(([field, counts]) => ({
        field,
        counts: Object.entries(counts).map(([name, count]) => ({ name, count })),
      })),
    }),
  );
}

function body(init: RequestInit): OccurrenceSearch {
  return JSON.parse(String(init.body)) as OccurrenceSearch;
}

function ratedCategory(predicate: Predicate): string | undefined {
  if (predicate.type !== "and") return undefined;
  const rated = predicate.predicates.find((p) => p.type === "in" && p.key === "IUCN_RED_LIST_CATEGORY");
  return rated?.type === "in" ? rated.values.join() : undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSpeciesStatuses", () => {
  function stubStatuses(byCategory: Record<string, Record<string, number>>) {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      facets({ SPECIES_KEY: byCategory[ratedCategory(body(init).predicate) ?? ""] ?? {} }),
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("gives each species the status its records carry, with one request per status", async () => {
    const fetchMock = stubStatuses({ CR: { "100": 5 }, EN: { "200": 7 } });
    await expect(fetchSpeciesStatuses()).resolves.toEqual(
      new Map([
        [100, "CR"],
        [200, "EN"],
      ]),
    );
    expect(fetchMock).toHaveBeenCalledTimes(ALL_IUCN_CATEGORIES.length);
  });

  it("uses the most severe status when records disagree", async () => {
    stubStatuses({ CR: { "100": 1 }, EN: { "100": 4 }, VU: { "100": 2 } });
    await expect(fetchSpeciesStatuses()).resolves.toEqual(new Map([[100, "CR"]]));
  });
});

describe("fetchSubspecies", () => {
  it("pages through every accepted subspecies in an order", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const offset = Number(new URL(url).searchParams.get("offset"));
      return new Response(
        JSON.stringify(
          offset === 0
            ? { endOfRecords: false, results: [{ key: 7059276, speciesKey: 5219416, canonicalName: "Panthera tigris tigris" }] }
            : { endOfRecords: true, results: [{ key: 5219420, speciesKey: 5219416, canonicalName: "Panthera tigris altaica" }, { key: 9 }] },
        ),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchSubspecies(732)).resolves.toEqual([
      { key: 7059276, speciesKey: 5219416, canonicalName: "Panthera tigris tigris" },
      { key: 5219420, speciesKey: 5219416, canonicalName: "Panthera tigris altaica" },
    ]);
    const params = new URL(fetchMock.mock.calls[0]![0]).searchParams;
    expect(params.get("rank")).toBe("SUBSPECIES");
    expect(params.get("status")).toBe("ACCEPTED");
    expect(params.get("highertaxonKey")).toBe("732");
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).searchParams.get("offset"))).toEqual(["0", "1000"]);
  });
});

describe("fetchSightingCounts", () => {
  it("counts tracked sightings in an order by species and by taxon", async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) =>
      facets({ SPECIES_KEY: { "5219416": 2785 }, TAXON_KEY: { "5219416": 2785, "7059276": 2320 } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const counts = await fetchSightingCounts(732, { speciesKeys: [5219416], subspeciesKeys: [7059276] });

    expect(counts.bySpecies).toEqual(new Map([[5219416, 2785]]));
    expect(counts.byTaxon.get(7059276)).toBe(2320);
    const search = body(fetchMock.mock.calls[0]![1]);
    expect(search.limit).toBe(0);
    expect(search.facets).toEqual(["SPECIES_KEY", "TAXON_KEY"]);
    expect(search.predicate).toMatchObject({
      type: "and",
      predicates: expect.arrayContaining([{ type: "in", key: "TAXON_KEY", values: ["732"] }]),
    });
  });
});

describe("fetchGbifTaxon", () => {
  it("looks up the species record by key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ canonicalName: "Lepilemur jamesi" })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchGbifTaxon(8303093)).resolves.toEqual({ canonicalName: "Lepilemur jamesi" });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.gbif.org/v1/species/8303093");
  });
});
