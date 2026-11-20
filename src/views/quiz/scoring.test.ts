import { describe, expect, it } from "vitest";
import { distanceKm, LOCATION_POINTS, locationPoints, NAME_POINTS, pointsBreakdown, score, timeUntil } from "./scoring";

describe("distanceKm", () => {
  it("is zero for the same place", () => {
    expect(distanceKm({ lat: 10, lng: 20 }, { lat: 10, lng: 20 })).toBe(0);
  });

  it("measures great-circle distance", () => {
    const londonToParis = distanceKm({ lat: 51.5074, lng: -0.1278 }, { lat: 48.8566, lng: 2.3522 });
    expect(londonToParis).toBeGreaterThan(340);
    expect(londonToParis).toBeLessThan(350);
  });

  it("takes the short way across the date line", () => {
    expect(distanceKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 })).toBeLessThan(250);
  });
});

describe("locationPoints", () => {
  it("gives full points for a perfect guess and falls off with distance", () => {
    expect(locationPoints(0)).toBe(LOCATION_POINTS);
    expect(locationPoints(100)).toBe(452);
    expect(locationPoints(1000)).toBe(184);
    expect(locationPoints(20_000)).toBe(0);
  });
});

describe("score", () => {
  it("adds the name points to the location points", () => {
    const here = { lat: 1, lng: 2 };
    expect(score(true, here, here)).toEqual({ nameCorrect: true, guess: here, km: 0, points: NAME_POINTS + LOCATION_POINTS });
    expect(score(false, here, here).points).toBe(LOCATION_POINTS);
  });
});

describe("pointsBreakdown", () => {
  it("splits a photo's points into the name and the location", () => {
    const here = { lat: 0, lng: 0 };
    expect(pointsBreakdown(score(true, here, { lat: 0, lng: 120 }))).toEqual({ name: NAME_POINTS, location: 0 });
    expect(pointsBreakdown(score(false, here, here))).toEqual({ name: 0, location: LOCATION_POINTS });
  });
});

describe("timeUntil", () => {
  it("splits the wait into hours, minutes and seconds", () => {
    expect(timeUntil(new Date("2026-11-19T01:29:30Z"), new Date("2026-11-19T06:00:00Z"))).toEqual({ hours: 4, minutes: 30, seconds: 30 });
    expect(timeUntil(new Date("2026-11-19T05:59:59.500Z"), new Date("2026-11-19T06:00:00Z"))).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });

  it("never goes negative", () => {
    expect(timeUntil(new Date("2026-11-19T07:00:00Z"), new Date("2026-11-19T06:00:00Z"))).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });
});
