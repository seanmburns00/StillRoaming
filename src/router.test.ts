import { describe, expect, it } from "vitest";
import { parseRoute, routes } from "./router";

describe("parseRoute", () => {
  it.each(["", "#", "#/", "#/unknown"])("defaults %j to the home page", (hash) => {
    expect(parseRoute(hash)).toEqual({ view: "home" });
  });

  it("parses the map without filters", () => {
    expect(parseRoute("#/map")).toEqual({ view: "map" });
  });

  it("parses the quiz", () => {
    expect(parseRoute("#/quiz")).toEqual({ view: "quiz" });
  });

  it("reads the full map state", () => {
    expect(parseRoute("#/map?species=5219416&from=2026-10-01&to=2026-10-31&status=CR,VU&country=NP&sighting=4321")).toEqual({
      view: "map",
      speciesKey: 5219416,
      from: "2026-10-01",
      to: "2026-10-31",
      statuses: ["CR", "VU"],
      country: "NP",
      sightingId: 4321,
    });
  });

  it.each([
    ["from=yesterday", {}],
    ["to=2026-1-5", {}],
    ["status=XX", {}],
    ["status=CR,XX", { statuses: ["CR"] }],
    ["country=nepal", {}],
    ["country=np", {}],
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
    expect(parseRoute(routes.home())).toEqual({ view: "home" });
    expect(parseRoute(routes.quiz())).toEqual({ view: "quiz" });
    expect(parseRoute(routes.organizations())).toEqual({ view: "organizations" });
    expect(parseRoute(routes.contents())).toEqual({ view: "contents" });
    expect(parseRoute(routes.chapter("Primates"))).toEqual({ view: "chapter", order: "Primates" });
    expect(parseRoute(routes.species(5219416))).toEqual({ view: "species", speciesKey: 5219416 });
    expect(parseRoute(routes.subspecies(7059276))).toEqual({ view: "subspecies", subspeciesKey: 7059276 });
    expect(parseRoute(routes.map({ subspeciesKey: 7059276 }))).toEqual({ view: "map", subspeciesKey: 7059276 });
  });

  it("round-trips the full map state", () => {
    const state = { subspeciesKey: 7059276, from: "2026-01-01", to: "2026-02-01", statuses: ["EN" as const], country: "IN", sightingId: 99 };
    expect(parseRoute(routes.map(state))).toEqual({ view: "map", ...state });
  });

  it("leaves out empty map state", () => {
    expect(routes.map({ statuses: [], country: undefined })).toBe("#/map");
  });

  it("builds share page paths relative to the site root", () => {
    expect(routes.sharePage("species", 5219416)).toBe("species/5219416/");
  });
});
