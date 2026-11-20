import { isIucnCategory, type IucnCategory } from "./models/iucn";

export interface MapState {
  speciesKey?: number;
  subspeciesKey?: number;
  from?: string;
  to?: string;
  statuses?: IucnCategory[];
  country?: string;
  sightingId?: number;
}

export type Route =
  | ({ view: "map" } & MapState)
  | { view: "contents" }
  | { view: "chapter"; order: string }
  | { view: "species"; speciesKey: number }
  | { view: "subspecies"; subspeciesKey: number }
  | { view: "organizations" };

export const routes = {
  map: (state: MapState = {}) => {
    const params = [
      ["species", state.speciesKey],
      ["subspecies", state.subspeciesKey],
      ["from", state.from],
      ["to", state.to],
      ["status", state.statuses?.join(",")],
      ["country", state.country],
      ["sighting", state.sightingId],
    ].filter(([, value]) => value !== undefined && value !== "");
    return params.length ? `#/map?${params.map(([key, value]) => `${key}=${value}`).join("&")}` : "#/map";
  },
  contents: () => "#/book",
  chapter: (order: string) => `#/book/${encodeURIComponent(order)}`,
  species: (speciesKey: number) => `#/species/${speciesKey}`,
  subspecies: (subspeciesKey: number) => `#/subspecies/${subspeciesKey}`,
  organizations: () => "#/organizations",
};

export function parseRoute(hash: string): Route {
  const [path = "", search = ""] = hash.replace(/^#\/?/, "").split("?");
  const [section, value] = path.split("/");

  if (section === "organizations") return { view: "organizations" };
  if (section === "book") {
    const order = value && safeDecode(value);
    return order ? { view: "chapter", order } : { view: "contents" };
  }
  if (section === "species") {
    const speciesKey = gbifKey(value);
    return speciesKey ? { view: "species", speciesKey } : { view: "contents" };
  }
  if (section === "subspecies") {
    const subspeciesKey = gbifKey(value);
    return subspeciesKey ? { view: "subspecies", subspeciesKey } : { view: "contents" };
  }
  return { view: "map", ...parseMapState(new URLSearchParams(search)) };
}

function parseMapState(params: URLSearchParams): MapState {
  const statuses = params.get("status")?.split(",").filter(isIucnCategory);
  const country = params.get("country");
  return {
    speciesKey: gbifKey(params.get("species")),
    subspeciesKey: gbifKey(params.get("subspecies")),
    from: isoDate(params.get("from")),
    to: isoDate(params.get("to")),
    statuses: statuses?.length ? statuses : undefined,
    country: country && /^[A-Z]{2}$/.test(country) ? country : undefined,
    sightingId: gbifKey(params.get("sighting")),
  };
}

function gbifKey(value: string | null | undefined): number | undefined {
  return value && /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

function isoDate(value: string | null): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function safeDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
