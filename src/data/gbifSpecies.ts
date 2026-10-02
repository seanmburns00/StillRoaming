import { getJson } from "../api/http";
import {
  anyOf,
  GBIF_API_URL,
  searchOccurrences,
  SIGHTING_FILTERS,
  trackedSightings,
  type OccurrencePage,
  type SightingScope,
} from "../api/gbif";
import { MAMMAL_ORDERS } from "../config";
import { ALL_IUCN_CATEGORIES, type IucnCategory } from "../models/iucn";

const GBIF_BACKBONE_DATASET = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c";
const SPECIES_SEARCH_PAGE_SIZE = 1000;
const FACET_LIMIT = 10000;

export interface GbifSubspecies {
  key: number;
  speciesKey: number;
  canonicalName: string;
}

export interface GbifTaxon {
  canonicalName?: string;
  vernacularName?: string;
}

export interface SightingCounts {
  bySpecies: Map<number, number>;
  byTaxon: Map<number, number>;
}

interface SpeciesSearchPage {
  endOfRecords: boolean;
  results: { key: number; speciesKey?: number; canonicalName?: string }[];
}

function facetCounts(page: OccurrencePage, field: string): Map<number, number> {
  const counts = page.facets.find((facet) => facet.field === field)?.counts ?? [];
  return new Map(counts.map(({ name, count }) => [Number(name), count]));
}

export async function fetchSpeciesStatuses(): Promise<Map<number, IucnCategory>> {
  const orderKeys = MAMMAL_ORDERS.map((order) => order.gbifKey);
  const byCategory = await Promise.all(
    ALL_IUCN_CATEGORIES.map(async (category) => {
      const page = await searchOccurrences({
        limit: 0,
        facets: ["SPECIES_KEY"],
        facetLimit: FACET_LIMIT,
        predicate: {
          type: "and",
          predicates: [...SIGHTING_FILTERS, anyOf("TAXON_KEY", orderKeys), anyOf("IUCN_RED_LIST_CATEGORY", [category])],
        },
      });
      return { category, speciesKeys: [...facetCounts(page, "SPECIES_KEY").keys()] };
    }),
  );

  const statuses = new Map<number, IucnCategory>();
  for (const { category, speciesKeys } of byCategory) {
    for (const speciesKey of speciesKeys) {
      if (!statuses.has(speciesKey)) statuses.set(speciesKey, category);
    }
  }
  return statuses;
}

export async function fetchSubspecies(orderKey: number): Promise<GbifSubspecies[]> {
  const subspecies: GbifSubspecies[] = [];
  for (let offset = 0; ; offset += SPECIES_SEARCH_PAGE_SIZE) {
    const params = new URLSearchParams({
      rank: "SUBSPECIES",
      status: "ACCEPTED",
      datasetKey: GBIF_BACKBONE_DATASET,
      highertaxonKey: String(orderKey),
      limit: String(SPECIES_SEARCH_PAGE_SIZE),
      offset: String(offset),
    });
    const page = await getJson<SpeciesSearchPage>(`${GBIF_API_URL}/species/search?${params}`);
    for (const { key, speciesKey, canonicalName } of page.results) {
      if (speciesKey !== undefined && canonicalName) subspecies.push({ key, speciesKey, canonicalName });
    }
    if (page.endOfRecords || page.results.length === 0) return subspecies;
  }
}

export async function fetchSightingCounts(orderKey: number, scope: SightingScope): Promise<SightingCounts> {
  const page = await searchOccurrences({
    limit: 0,
    facets: ["SPECIES_KEY", "TAXON_KEY"],
    facetLimit: FACET_LIMIT,
    predicate: { type: "and", predicates: [...SIGHTING_FILTERS, anyOf("TAXON_KEY", [orderKey]), trackedSightings(scope)] },
  });
  return { bySpecies: facetCounts(page, "SPECIES_KEY"), byTaxon: facetCounts(page, "TAXON_KEY") };
}

export function fetchGbifTaxon(speciesKey: number): Promise<GbifTaxon> {
  return getJson<GbifTaxon>(`${GBIF_API_URL}/species/${speciesKey}`);
}
