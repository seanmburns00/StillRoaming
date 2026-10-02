import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_SIGHTINGS } from "../config";
import type { SpeciesSummary } from "../models/species";
import {
  fetchSightings,
  PAGE_SIZE,
  sightingScope,
  sightingSearch,
  toDisplaySize,
  toSighting,
  trackedSightings,
  type GbifOccurrence,
  type OccurrenceSearch,
  type SightingQuery,
} from "./gbif";

const tiger: SpeciesSummary = {
  gbifKey: 5219416,
  taxonName: "Panthera tigris",
  commonName: "Tiger",
  category: "EN",
  order: "Carnivora",
  sightings: 2785,
  subspecies: [
    { gbifKey: 7059276, taxonName: "Panthera tigris tigris", commonName: "Bengal tiger", sightings: 10 },
    { gbifKey: 5219420, taxonName: "Panthera tigris altaica", commonName: "Siberian tiger", sightings: 10 },
  ],
};
const polarBear: SpeciesSummary = {
  gbifKey: 2433451,
  taxonName: "Ursus maritimus",
  commonName: "Polar bear",
  category: "VU",
  order: "Carnivora",
  sightings: 2330,
  subspecies: [],
};
const speciesByKey = new Map([tiger, polarBear].map((species) => [species.gbifKey, species]));
const query: SightingQuery = { from: "2025-01-01", to: "2025-03-31", categories: ["EN", "VU"] };

function occurrence(overrides: Partial<GbifOccurrence> = {}): GbifOccurrence {
  return {
    key: 42,
    speciesKey: 5219416,
    acceptedTaxonKey: 7059276,
    scientificName: "Panthera tigris tigris",
    species: "Panthera tigris",
    decimalLatitude: 21.5,
    decimalLongitude: 79.2,
    eventDate: "2025-02-03T06:15",
    stateProvince: "Maharashtra",
    country: "India",
    recordedBy: "A. Ranger",
    media: [
      {
        type: "StillImage",
        identifier: "https://inaturalist-open-data.s3.amazonaws.com/photos/123/original.jpeg",
        rightsHolder: "A. Ranger",
        license: "http://creativecommons.org/licenses/by-nc/4.0/",
      },
    ],
    ...overrides,
  };
}

describe("sightingScope", () => {
  it("includes the species with a selected status and all of their subspecies", () => {
    expect(sightingScope(speciesByKey.values(), query)).toEqual({
      speciesKeys: [5219416, 2433451],
      subspeciesKeys: [7059276, 5219420],
    });
  });

  it("leaves out species whose status is not selected", () => {
    expect(sightingScope(speciesByKey.values(), { ...query, categories: ["VU"] })).toEqual({ speciesKeys: [2433451], subspeciesKeys: [] });
  });

  it("narrows to a single subspecies", () => {
    expect(sightingScope(speciesByKey.values(), { ...query, subspeciesKey: 5219420 })).toEqual({ speciesKeys: [], subspeciesKeys: [5219420] });
  });

  it("finds nothing for a subspecies whose species status is not selected or that is not tracked", () => {
    expect(sightingScope(speciesByKey.values(), { ...query, categories: ["VU"], subspeciesKey: 5219420 })).toEqual({
      speciesKeys: [],
      subspeciesKeys: [],
    });
    expect(sightingScope(speciesByKey.values(), { ...query, subspeciesKey: 1 })).toEqual({ speciesKeys: [], subspeciesKeys: [] });
  });

  it("narrows to a single species", () => {
    expect(sightingScope(speciesByKey.values(), { ...query, speciesKey: 5219416 })).toEqual({
      speciesKeys: [5219416],
      subspeciesKeys: [7059276, 5219420],
    });
  });
});

describe("trackedSightings", () => {
  it("takes rated records of tracked species, plus every record of their subspecies, which GBIF never rates", () => {
    expect(trackedSightings({ speciesKeys: [5219416], subspeciesKeys: [7059276] })).toEqual({
      type: "or",
      predicates: [
        {
          type: "and",
          predicates: [
            { type: "in", key: "TAXON_KEY", values: ["5219416"] },
            { type: "in", key: "IUCN_RED_LIST_CATEGORY", values: ["CR", "EN", "VU"] },
          ],
        },
        { type: "in", key: "TAXON_KEY", values: ["7059276"] },
      ],
    });
  });

  it("searches only the subspecies when no species are in scope", () => {
    expect(trackedSightings({ speciesKeys: [], subspeciesKeys: [5219420] })).toEqual({ type: "in", key: "TAXON_KEY", values: ["5219420"] });
  });

  it("does not send an empty subspecies list", () => {
    expect(trackedSightings({ speciesKeys: [2433451], subspeciesKeys: [] })).toEqual({
      type: "and",
      predicates: [
        { type: "in", key: "TAXON_KEY", values: ["2433451"] },
        { type: "in", key: "IUCN_RED_LIST_CATEGORY", values: ["CR", "EN", "VU"] },
      ],
    });
  });
});

describe("sightingSearch", () => {
  it("asks for mapped, photographed, present records in the date range, one page at a time", () => {
    const search = sightingSearch(query, { speciesKeys: [1], subspeciesKeys: [] }, 600);
    expect(search.limit).toBe(PAGE_SIZE);
    expect(search.offset).toBe(600);
    expect(search.predicate).toMatchObject({
      type: "and",
      predicates: expect.arrayContaining([
        { type: "equals", key: "HAS_COORDINATE", value: "true" },
        { type: "equals", key: "HAS_GEOSPATIAL_ISSUE", value: "false" },
        { type: "equals", key: "OCCURRENCE_STATUS", value: "PRESENT" },
        { type: "equals", key: "MEDIA_TYPE", value: "StillImage" },
        { type: "equals", key: "EVENT_DATE", value: "2025-01-01,2025-03-31" },
      ]),
    });
  });
});

describe("toSighting", () => {
  it("maps a GBIF occurrence, taking the status from the species list", () => {
    expect(toSighting(occurrence(), speciesByKey)).toEqual({
      id: 42,
      speciesKey: 5219416,
      taxonKey: 7059276,
      scientificName: "Panthera tigris",
      category: "EN",
      lat: 21.5,
      lng: 79.2,
      date: "2025-02-03",
      place: "Maharashtra, India",
      observer: "A. Ranger",
      photo: {
        url: "https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpeg",
        credit: "A. Ranger",
        license: "https://creativecommons.org/licenses/by-nc/4.0/",
      },
      gbifUrl: "https://www.gbif.org/occurrence/42",
    });
  });

  it("uses the start of a date range", () => {
    expect(toSighting(occurrence({ eventDate: "2025-02-01/2025-02-28" }), speciesByKey)?.date).toBe("2025-02-01");
  });

  it("treats a latitude or longitude of zero as a real coordinate", () => {
    expect(toSighting(occurrence({ decimalLatitude: 0, decimalLongitude: 0 }), speciesByKey)).toMatchObject({ lat: 0, lng: 0 });
  });

  it.each([
    ["no latitude", { decimalLatitude: undefined }],
    ["no longitude", { decimalLongitude: undefined }],
    ["no species", { speciesKey: undefined }],
    ["a species that is not tracked", { speciesKey: 2441110 }],
  ])("skips occurrences with %s", (_, overrides) => {
    expect(toSighting(occurrence(overrides), speciesByKey)).toBeNull();
  });

  it("omits the photo when there is no still image or it is not a web URL", () => {
    expect(toSighting(occurrence({ media: [{ type: "Sound", identifier: "https://example.org/a.mp3" }] }), speciesByKey)?.photo).toBeUndefined();
    expect(toSighting(occurrence({ media: [{ type: "StillImage", identifier: "javascript:alert(1)" }] }), speciesByKey)?.photo).toBeUndefined();
    expect(toSighting(occurrence({ media: undefined }), speciesByKey)?.photo).toBeUndefined();
  });

  it("credits the creator when there is no rights holder", () => {
    const sighting = toSighting(
      occurrence({ media: [{ type: "StillImage", identifier: "https://example.org/a.jpg", creator: "B. Tracker" }] }),
      speciesByKey,
    );
    expect(sighting?.photo?.credit).toBe("B. Tracker");
  });
});

describe("toDisplaySize", () => {
  it("swaps iNaturalist originals for the medium size", () => {
    expect(toDisplaySize("https://inaturalist-open-data.s3.amazonaws.com/photos/9/original.png")).toBe(
      "https://inaturalist-open-data.s3.amazonaws.com/photos/9/medium.png",
    );
  });

  it("leaves other hosts alone", () => {
    expect(toDisplaySize("https://example.org/photos/9/original.jpg")).toBe("https://example.org/photos/9/original.jpg");
  });
});

describe("fetchSightings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubGbif(count: number) {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const { offset = 0 } = JSON.parse(String(init.body)) as OccurrenceSearch;
      const size = Math.max(0, Math.min(PAGE_SIZE, count - offset));
      const results = Array.from({ length: size }, (_, i) => occurrence({ key: offset + i }));
      return new Response(JSON.stringify({ count, results, facets: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  function offsets(fetchMock: ReturnType<typeof stubGbif>) {
    return fetchMock.mock.calls.map(([, init]) => (JSON.parse(String(init.body)) as OccurrenceSearch).offset);
  }

  it("posts the search to GBIF", async () => {
    const fetchMock = stubGbif(1);
    await fetchSightings(query, speciesByKey);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.gbif.org/v1/occurrence/search/predicate");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("searches a single subspecies", async () => {
    const fetchMock = stubGbif(1);
    await fetchSightings({ ...query, subspeciesKey: 5219420 }, speciesByKey);
    expect(JSON.stringify(JSON.parse(String(fetchMock.mock.calls[0]![1].body)).predicate)).toContain('{"type":"in","key":"TAXON_KEY","values":["5219420"]}');
  });

  it("does not query GBIF when no species are in scope, since an empty filter would match everything", async () => {
    const fetchMock = stubGbif(10);
    await expect(fetchSightings({ ...query, subspeciesKey: 1 }, speciesByKey)).resolves.toEqual({ sightings: [], total: 0 });
    await expect(fetchSightings({ ...query, categories: [] }, speciesByKey)).resolves.toEqual({ sightings: [], total: 0 });
    await expect(fetchSightings(query, new Map())).resolves.toEqual({ sightings: [], total: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches every page needed when under the cap", async () => {
    const fetchMock = stubGbif(PAGE_SIZE * 2 + 1);
    const { sightings } = await fetchSightings(query, speciesByKey);
    expect(offsets(fetchMock)).toEqual([0, PAGE_SIZE, PAGE_SIZE * 2]);
    expect(new Set(sightings.map((s) => s.id)).size).toBe(PAGE_SIZE * 2 + 1);
  });

  it("stops at the cap but reports the true total", async () => {
    const fetchMock = stubGbif(MAX_SIGHTINGS * 10);
    const { sightings, total } = await fetchSightings(query, speciesByKey);
    expect(fetchMock).toHaveBeenCalledTimes(Math.ceil(MAX_SIGHTINGS / PAGE_SIZE));
    expect(sightings).toHaveLength(MAX_SIGHTINGS);
    expect(total).toBe(MAX_SIGHTINGS * 10);
  });

  it("fails rather than showing a partial map when a later page errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) =>
        (JSON.parse(String(init.body)) as OccurrenceSearch).offset === 0
          ? new Response(JSON.stringify({ count: PAGE_SIZE * 2, results: [occurrence()], facets: [] }))
          : new Response("error", { status: 500 }),
      ),
    );
    await expect(fetchSightings(query, speciesByKey)).rejects.toThrow("status 500");
  });
});
