export type Route =
  | { view: "map"; speciesKey?: number; subspeciesKey?: number }
  | { view: "contents" }
  | { view: "chapter"; order: string }
  | { view: "species"; speciesKey: number }
  | { view: "subspecies"; subspeciesKey: number };

export const routes = {
  map: (speciesKey?: number) => (speciesKey ? `#/map?species=${speciesKey}` : "#/map"),
  subspeciesMap: (subspeciesKey: number) => `#/map?subspecies=${subspeciesKey}`,
  contents: () => "#/book",
  chapter: (order: string) => `#/book/${encodeURIComponent(order)}`,
  species: (speciesKey: number) => `#/species/${speciesKey}`,
  subspecies: (subspeciesKey: number) => `#/subspecies/${subspeciesKey}`,
};

export function parseRoute(hash: string): Route {
  const [path = "", search = ""] = hash.replace(/^#\/?/, "").split("?");
  const [section, value] = path.split("/");

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
  const params = new URLSearchParams(search);
  return { view: "map", speciesKey: gbifKey(params.get("species")), subspeciesKey: gbifKey(params.get("subspecies")) };
}

function gbifKey(value: string | null | undefined): number | undefined {
  return value && /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

function safeDecode(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
