import { describe, expect, it } from "vitest";
import { DEFAULT_LOOKBACK_DAYS, MAX_SIGHTINGS } from "../../config";
import { defaultQuery, describeResults, toMapState, validateQuery } from "./query";

describe("defaultQuery", () => {
  it("looks back over the default window from today, using local dates", () => {
    const today = new Date(2025, 2, 31, 23, 30);
    const from = new Date(2025, 2, 31 - DEFAULT_LOOKBACK_DAYS);
    const expectedFrom = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;

    expect(defaultQuery(today)).toEqual({ from: expectedFrom, to: "2025-03-31", categories: ["CR", "EN"], speciesKey: undefined });
  });

  it("defaults to the last 30 days", () => {
    expect(defaultQuery(new Date(2025, 2, 31))).toMatchObject({ from: "2025-03-01", to: "2025-03-31" });
    expect(defaultQuery(new Date(2025, 0, 15))).toMatchObject({ from: "2024-12-16", to: "2025-01-15" });
  });

  it("includes every tracked status when showing a single subspecies", () => {
    expect(defaultQuery(new Date(2025, 0, 1), { subspeciesKey: 7059276 })).toMatchObject({ categories: ["CR", "EN", "VU"], subspeciesKey: 7059276 });
  });

  it("restores the dates, statuses and country from the map state", () => {
    expect(
      defaultQuery(new Date(2025, 0, 1), { speciesKey: 2435099, from: "2024-06-01", to: "2024-06-30", statuses: ["VU"], country: "KE" }),
    ).toEqual({ from: "2024-06-01", to: "2024-06-30", categories: ["VU"], speciesKey: 2435099, subspeciesKey: undefined, country: "KE" });
  });

  it("round-trips through the map state, leaving out the visitor's location", () => {
    const query = defaultQuery(new Date(2025, 0, 1), { subspeciesKey: 7059276, country: "IN" });
    const state = toMapState({ ...query, near: { lat: 1, lng: 2, km: 100 } }, 42);
    expect(state).not.toHaveProperty("near");
    expect(state.sightingId).toBe(42);
    expect(defaultQuery(new Date(2030, 0, 1), state)).toEqual(query);
  });

  it("includes every tracked status when showing a single species, so Vulnerable species still appear", () => {
    expect(defaultQuery(new Date(2025, 0, 1), { speciesKey: 2435099 })).toMatchObject({
      categories: ["CR", "EN", "VU"],
      speciesKey: 2435099,
    });
  });
});

describe("validateQuery", () => {
  const valid = { from: "2025-01-01", to: "2025-01-31", categories: ["CR" as const] };

  it("accepts a valid range, including a single day", () => {
    expect(validateQuery(valid)).toBeUndefined();
    expect(validateQuery({ ...valid, to: valid.from })).toBeUndefined();
  });

  it("requires both dates", () => {
    expect(validateQuery({ ...valid, from: "" })).toMatch(/both/);
    expect(validateQuery({ ...valid, to: "" })).toMatch(/both/);
  });

  it("rejects a start date after the end date", () => {
    expect(validateQuery({ ...valid, from: "2025-02-01" })).toMatch(/on or before/);
  });
});

describe("describeResults", () => {
  it("suggests widening the search when nothing is found", () => {
    expect(describeResults(0, 0)).toMatch(/No sightings/);
  });

  it("reports the count when everything is shown", () => {
    expect(describeResults(1200, 1200)).toBe("Showing 1,200 sightings.");
  });

  it("uses the singular for one sighting", () => {
    expect(describeResults(1, 1)).toBe("Showing 1 sighting.");
  });

  it("says when the map is capped", () => {
    expect(describeResults(MAX_SIGHTINGS, 13776)).toBe(
      `Showing the first ${MAX_SIGHTINGS.toLocaleString()} of 13,776 sightings. Narrow the date range to see them all.`,
    );
  });
});
