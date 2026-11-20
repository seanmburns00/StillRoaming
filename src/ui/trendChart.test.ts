// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { roundedBar, trendChart, trendSummary } from "./trendChart";

const years = [
  { year: 2024, count: 2 },
  { year: 2025, count: 0 },
  { year: 2026, count: 8 },
];

describe("trendChart", () => {
  it("draws a bar for each year with sightings and labels the peak", () => {
    const container = document.createElement("div");
    container.append(...trendChart(years));

    expect(container.querySelectorAll(".trend__bar")).toHaveLength(2);
    expect(container.querySelector(".trend__peak")?.textContent).toBe("8");
    expect([...container.querySelectorAll(".trend__tick")].map((tick) => tick.textContent)).toEqual(["2024", "2026"]);
  });

  it("gives every year a hover label, including years with none", () => {
    const container = document.createElement("div");
    container.append(...trendChart(years));
    expect([...container.querySelectorAll("title")].map((title) => title.textContent)).toEqual([
      "2024: 2 sightings",
      "2025: 0 sightings",
      "2026: 8 sightings",
    ]);
  });

  it("offers the numbers as a table", () => {
    const container = document.createElement("div");
    container.append(...trendChart(years));
    expect([...container.querySelectorAll("tbody td")].map((cell) => cell.textContent)).toEqual(["2024", "2", "2025", "0", "2026", "8"]);
  });

  it("draws no bars and no peak when there are no sightings", () => {
    const container = document.createElement("div");
    container.append(...trendChart([{ year: 2026, count: 0 }]));
    expect(container.querySelector(".trend__bar")).toBeNull();
    expect(container.querySelector(".trend__peak")).toBeNull();
  });

  it("draws nothing without data", () => {
    expect(trendChart([])).toEqual([]);
  });
});

describe("trendSummary", () => {
  it("describes the total and the peak for screen readers", () => {
    expect(trendSummary(years, years[2]!)).toBe("10 sightings from 2024 to 2026, peaking at 8 in 2026.");
  });

  it("says when there were none", () => {
    expect(trendSummary([{ year: 2025, count: 0 }], { year: 2025, count: 0 })).toBe("No photographed sightings from 2025 to 2025.");
  });
});

describe("roundedBar", () => {
  it("never rounds a short bar past its own height", () => {
    expect(roundedBar(0, 100, 10, 1)).toBe("M0,100V100Q0,99 1,99H9Q10,99 10,100V100Z");
  });
});
