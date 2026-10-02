import type { SightingQuery, TaxonFilter } from "../../api/gbif";
import { DEFAULT_LOOKBACK_DAYS, MAX_SIGHTINGS } from "../../config";
import { ALL_IUCN_CATEGORIES } from "../../models/iucn";
import { sightingsLabel } from "../../ui/labels";

export function defaultQuery(today: Date, filter: TaxonFilter = {}): SightingQuery {
  const from = new Date(today);
  from.setDate(from.getDate() - DEFAULT_LOOKBACK_DAYS);
  const focused = filter.speciesKey !== undefined || filter.subspeciesKey !== undefined;
  return { from: isoDate(from), to: isoDate(today), categories: focused ? ALL_IUCN_CATEGORIES : ["CR", "EN"], ...filter };
}

export function validateQuery(query: SightingQuery): string | undefined {
  if (!query.from || !query.to) return "Choose both a start and an end date.";
  if (query.from > query.to) return "The start date must be on or before the end date.";
  return undefined;
}

export function describeResults(shown: number, total: number): string {
  if (total === 0) return "No sightings match these filters. Try a wider date range.";
  if (total > MAX_SIGHTINGS) {
    return `Showing the first ${shown.toLocaleString()} of ${sightingsLabel(total)}. Narrow the date range to see them all.`;
  }
  return `Showing ${sightingsLabel(shown)}.`;
}

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
