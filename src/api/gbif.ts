import { MAX_SIGHTINGS } from "../config";
import { ALL_IUCN_CATEGORIES, type IucnCategory } from "../models/iucn";
import type { Sighting } from "../models/sighting";
import type { SpeciesSummary } from "../models/species";
import { getJson, secureUrl } from "./http";

export const GBIF_API_URL = "https://api.gbif.org/v1";
export const PAGE_SIZE = 300;

export interface TaxonFilter {
  speciesKey?: number;
  subspeciesKey?: number;
}

export interface Nearby {
  lat: number;
  lng: number;
  km: number;
}

export interface SightingQuery extends TaxonFilter {
  from: string;
  to: string;
  categories: IucnCategory[];
  country?: string;
  near?: Nearby;
}

export interface YearCount {
  year: number;
  count: number;
}

export interface SightingScope {
  speciesKeys: number[];
  subspeciesKeys: number[];
}

export interface SightingResults {
  sightings: Sighting[];
  total: number;
}

export type Predicate =
  | { type: "equals"; key: string; value: string }
  | { type: "in"; key: string; values: string[] }
  | { type: "and" | "or"; predicates: Predicate[] }
  | { type: "geoDistance"; latitude: string; longitude: string; distance: string };

export interface OccurrenceSearch {
  predicate: Predicate;
  limit: number;
  offset?: number;
  facets?: string[];
  facetLimit?: number;
}

interface GbifMedia {
  type?: string;
  identifier?: string;
  creator?: string;
  rightsHolder?: string;
  license?: string;
}

export interface GbifOccurrence {
  key: number;
  speciesKey?: number;
  acceptedTaxonKey?: number;
  scientificName: string;
  species?: string;
  decimalLatitude?: number;
  decimalLongitude?: number;
  eventDate?: string;
  locality?: string;
  stateProvince?: string;
  country?: string;
  recordedBy?: string;
  media?: GbifMedia[];
}

export interface OccurrencePage {
  count: number;
  results: GbifOccurrence[];
  facets: { field: string; counts: { name: string; count: number }[] }[];
}

export const SIGHTING_FILTERS: Predicate[] = [
  { type: "equals", key: "HAS_COORDINATE", value: "true" },
  { type: "equals", key: "HAS_GEOSPATIAL_ISSUE", value: "false" },
  { type: "equals", key: "OCCURRENCE_STATUS", value: "PRESENT" },
  { type: "equals", key: "MEDIA_TYPE", value: "StillImage" },
];

export function anyOf(key: string, values: (string | number)[]): Predicate {
  return { type: "in", key, values: values.map(String) };
}

export function trackedSightings(scope: SightingScope): Predicate {
  const branches: Predicate[] = [];
  if (scope.speciesKeys.length > 0) {
    branches.push({
      type: "and",
      predicates: [anyOf("TAXON_KEY", scope.speciesKeys), anyOf("IUCN_RED_LIST_CATEGORY", ALL_IUCN_CATEGORIES)],
    });
  }
  if (scope.subspeciesKeys.length > 0) branches.push(anyOf("TAXON_KEY", scope.subspeciesKeys));
  return branches.length === 1 ? branches[0]! : { type: "or", predicates: branches };
}

export function searchOccurrences(search: OccurrenceSearch, signal?: AbortSignal): Promise<OccurrencePage> {
  return getJson<OccurrencePage>(`${GBIF_API_URL}/occurrence/search/predicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(search),
    signal,
  });
}

export function sightingScope(species: Iterable<SpeciesSummary>, query: SightingQuery): SightingScope {
  const { subspeciesKey, speciesKey } = query;
  const withStatus = [...species].filter((entry) => query.categories.includes(entry.category));
  if (subspeciesKey !== undefined) {
    const known = withStatus.some((entry) => entry.subspecies.some((subspecies) => subspecies.gbifKey === subspeciesKey));
    return { speciesKeys: [], subspeciesKeys: known ? [subspeciesKey] : [] };
  }
  const inScope = speciesKey === undefined ? withStatus : withStatus.filter((entry) => entry.gbifKey === speciesKey);
  return {
    speciesKeys: inScope.map((entry) => entry.gbifKey),
    subspeciesKeys: inScope.flatMap((entry) => entry.subspecies.map((subspecies) => subspecies.gbifKey)),
  };
}

export function speciesScope(species: SpeciesSummary): SightingScope {
  return { speciesKeys: [species.gbifKey], subspeciesKeys: species.subspecies.map((entry) => entry.gbifKey) };
}

export function sightingSearch(query: SightingQuery, scope: SightingScope, offset: number): OccurrenceSearch {
  return {
    limit: PAGE_SIZE,
    offset,
    predicate: {
      type: "and",
      predicates: [
        ...SIGHTING_FILTERS,
        { type: "equals", key: "EVENT_DATE", value: `${query.from},${query.to}` },
        ...placeFilters(query),
        trackedSightings(scope),
      ],
    },
  };
}

export function placeFilters({ country, near }: Pick<SightingQuery, "country" | "near">): Predicate[] {
  const filters: Predicate[] = [];
  if (country) filters.push({ type: "equals", key: "COUNTRY", value: country });
  if (near) {
    filters.push({ type: "geoDistance", latitude: String(near.lat), longitude: String(near.lng), distance: `${near.km}km` });
  }
  return filters;
}

export const TREND_YEARS = 20;

export async function fetchSightingsByYear(scope: SightingScope, lastYear: number, signal?: AbortSignal): Promise<YearCount[]> {
  const firstYear = lastYear - TREND_YEARS + 1;
  const page = await searchOccurrences(
    {
      limit: 0,
      facets: ["YEAR"],
      facetLimit: TREND_YEARS,
      predicate: {
        type: "and",
        predicates: [...SIGHTING_FILTERS, { type: "equals", key: "YEAR", value: `${firstYear},${lastYear}` }, trackedSightings(scope)],
      },
    },
    signal,
  );
  const counts = page.facets.find((facet) => facet.field === "YEAR")?.counts ?? [];
  const byYear = new Map(counts.map(({ name, count }) => [Number(name), count]));
  return Array.from({ length: TREND_YEARS }, (_, i) => ({ year: firstYear + i, count: byYear.get(firstYear + i) ?? 0 }));
}

export function densityTilesUrl(taxonKey: number): string {
  return `https://api.gbif.org/v2/map/occurrence/density/{z}/{x}/{y}@1x.png?taxonKey=${taxonKey}&bin=hex&hexPerTile=40&style=classic-noborder.poly`;
}

export async function fetchSightings(
  query: SightingQuery,
  speciesByKey: ReadonlyMap<number, SpeciesSummary>,
  signal?: AbortSignal,
  limit = MAX_SIGHTINGS,
): Promise<SightingResults> {
  const scope = sightingScope(speciesByKey.values(), query);
  if (scope.speciesKeys.length === 0 && scope.subspeciesKeys.length === 0) return { sightings: [], total: 0 };

  const firstPage = await searchOccurrences(sightingSearch(query, scope, 0), signal);
  const remainingOffsets: number[] = [];
  for (let offset = PAGE_SIZE; offset < Math.min(firstPage.count, limit); offset += PAGE_SIZE) {
    remainingOffsets.push(offset);
  }
  const remainingPages = await Promise.all(
    remainingOffsets.map((offset) => searchOccurrences(sightingSearch(query, scope, offset), signal)),
  );

  const sightings = [firstPage, ...remainingPages]
    .flatMap((page) => page.results)
    .map((occurrence) => toSighting(occurrence, speciesByKey))
    .filter((sighting) => sighting !== null);
  return { sightings, total: firstPage.count };
}

export function toSighting(occurrence: GbifOccurrence, speciesByKey: ReadonlyMap<number, SpeciesSummary>): Sighting | null {
  const { decimalLatitude: lat, decimalLongitude: lng, speciesKey } = occurrence;
  const species = speciesKey === undefined ? undefined : speciesByKey.get(speciesKey);
  if (lat === undefined || lng === undefined || speciesKey === undefined || !species) return null;

  const image = occurrence.media?.find((media) => media.type === "StillImage");
  const photoUrl = secureUrl(image?.identifier);

  return {
    id: occurrence.key,
    speciesKey,
    taxonKey: occurrence.acceptedTaxonKey,
    scientificName: occurrence.species ?? occurrence.scientificName,
    category: species.category,
    lat,
    lng,
    date: occurrence.eventDate?.slice(0, 10),
    place: [occurrence.locality, occurrence.stateProvince, occurrence.country].filter(Boolean).join(", "),
    observer: occurrence.recordedBy,
    photo: photoUrl
      ? { url: toDisplaySize(photoUrl), credit: image?.rightsHolder ?? image?.creator, license: secureUrl(image?.license) }
      : undefined,
    gbifUrl: `https://www.gbif.org/occurrence/${occurrence.key}`,
  };
}

export function toDisplaySize(photoUrl: string): string {
  return photoUrl.replace(/(inaturalist-open-data\.s3\.amazonaws\.com\/photos\/\d+\/)original\./, "$1medium.");
}
