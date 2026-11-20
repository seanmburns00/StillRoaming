import type { SightingQuery } from "../../api/gbif";
import { DEFAULT_LOOKBACK_DAYS, MAX_SIGHTINGS } from "../../config";
import { ALL_IUCN_CATEGORIES } from "../../models/iucn";
import type { MapState } from "../../router";
import { sightingsLabel } from "../../ui/labels";

export function defaultQuery(today: Date, state: MapState = {}): SightingQuery {
  const from = new Date(today);
  from.setDate(from.getDate() - DEFAULT_LOOKBACK_DAYS);
  const focused = state.speciesKey !== undefined || state.subspeciesKey !== undefined;
  return {
    from: state.from ?? isoDate(from),
    to: state.to ?? isoDate(today),
    categories: state.statuses ?? (focused ? ALL_IUCN_CATEGORIES : ["CR", "EN"]),
    speciesKey: state.speciesKey,
    subspeciesKey: state.subspeciesKey,
    country: state.country,
  };
}

export function toMapState(query: SightingQuery, sightingId?: number): MapState {
  return {
    speciesKey: query.speciesKey,
    subspeciesKey: query.subspeciesKey,
    from: query.from,
    to: query.to,
    statuses: query.categories,
    country: query.country,
    sightingId,
  };
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
