import { describe, expect, it } from "vitest";
import { parseRoute, routes } from "./router";

describe("parseRoute", () => {
  it.each(["", "#", "#/", "#/map", "#/unknown"])("defaults %j to the map", (hash) => {
    expect(parseRoute(hash)).toEqual({ view: "map" });
  });

  it("reads the full map state", () => {
    expect(parseRoute("#/map?species=5219416&from=2026-10-01&to=2026-10-31&status=CR,VU&sighting=4321")).toEqual({
      view: "map",
      speciesKey: 5219416,
      from: "2026-10-01",
      to: "2026-10-31",
      statuses: ["CR", "VU"],
      sightingId: 4321,
    });
  });

  it.each([
    ["from=yesterday", {}],
    ["to=2026-1-5", {}],
    ["status=XX", {}],
    ["status=CR,XX", { statuses: ["CR"] }],
    ["sighting=abc", {}],
  ])("ignores invalid map state %j", (search, expected) => {
    expect(parseRoute(`#/map?${search}`)).toEqual({ view: "map", ...expected });
  });

  it("reads a species filter on the map", () => {
    expect(parseRoute("#/map?species=5219416")).toEqual({ view: "map", speciesKey: 5219416 });
  });

  it.each(["abc", "0", "-5", "1.5", "12abc"])("ignores an invalid species filter %j", (value) => {
    expect(parseRoute(`#/map?species=${value}`)).toEqual({ view: "map" });
  });

  it("parses the field guide contents", () => {
    expect(parseRoute("#/book")).toEqual({ view: "contents" });
    expect(parseRoute("#/book/")).toEqual({ view: "contents" });
  });

  it("parses a chapter", () => {
    expect(parseRoute("#/book/Primates")).toEqual({ view: "chapter", order: "Primates" });
  });

  it("falls back to the contents for a malformed chapter name instead of crashing", () => {
    expect(parseRoute("#/book/%E0%A4%A")).toEqual({ view: "contents" });
  });

  it("parses a species page", () => {
    expect(parseRoute("#/species/5219416")).toEqual({ view: "species", speciesKey: 5219416 });
  });

  it("parses a subspecies page and a subspecies filter on the map", () => {
    expect(parseRoute("#/subspecies/7059276")).toEqual({ view: "subspecies", subspeciesKey: 7059276 });
    expect(parseRoute("#/map?subspecies=7059276")).toEqual({ view: "map", subspeciesKey: 7059276 });
  });

  it.each(["#/species", "#/species/", "#/species/tiger", "#/subspecies/", "#/subspecies/bengal"])("falls back to the contents for %j", (hash) => {
    expect(parseRoute(hash)).toEqual({ view: "contents" });
  });
});

describe("routes", () => {
  it("round-trips every route", () => {
    expect(parseRoute(routes.map())).toEqual({ view: "map" });
    expect(parseRoute(routes.map({ speciesKey: 5219416 }))).toEqual({ view: "map", speciesKey: 5219416 });
    expect(parseRoute(routes.contents())).toEqual({ view: "contents" });
    expect(parseRoute(routes.chapter("Primates"))).toEqual({ view: "chapter", order: "Primates" });
    expect(parseRoute(routes.species(5219416))).toEqual({ view: "species", speciesKey: 5219416 });
    expect(parseRoute(routes.subspecies(7059276))).toEqual({ view: "subspecies", subspeciesKey: 7059276 });
    expect(parseRoute(routes.map({ subspeciesKey: 7059276 }))).toEqual({ view: "map", subspeciesKey: 7059276 });
  });

  it("round-trips the full map state", () => {
    const state = { subspeciesKey: 7059276, from: "2026-01-01", to: "2026-02-01", statuses: ["EN" as const], sightingId: 99 };
    expect(parseRoute(routes.map(state))).toEqual({ view: "map", ...state });
  });

  it("leaves out empty map state", () => {
    expect(routes.map({ statuses: [] })).toBe("#/map");
  });
});
