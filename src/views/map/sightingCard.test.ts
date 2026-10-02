// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { Sighting } from "../../models/sighting";
import type { SpeciesSummary } from "../../models/species";
import { sightingCard } from "./sightingCard";

const sighting: Sighting = {
  id: 7,
  speciesKey: 5219416,
  taxonKey: 5219416,
  scientificName: "Panthera tigris",
  category: "EN",
  lat: 21.512345,
  lng: 79.123456,
  date: "2025-03-01",
  place: "Maharashtra, India",
  observer: "A. Ranger",
  photo: { url: "https://example.org/tiger.jpg", credit: "A. Ranger", license: "https://creativecommons.org/licenses/by/4.0/" },
  gbifUrl: "https://www.gbif.org/occurrence/7",
};

const tiger: SpeciesSummary = {
  gbifKey: 5219416,
  taxonName: "Panthera tigris",
  commonName: "Tiger",
  category: "EN",
  order: "Carnivora",
  sightings: 2785,
  subspecies: [
    { gbifKey: 7059276, taxonName: "Panthera tigris tigris", commonName: "Bengal tiger", sightings: 10 },
    { gbifKey: 5219422, taxonName: "Panthera tigris sondaica", sightings: 10 },
  ],
};

function hrefs(card: HTMLElement): string[] {
  return [...card.querySelectorAll("a")].map((link) => link.getAttribute("href") ?? "");
}

describe("sightingCard", () => {
  it("shows the photo, status, details and links for a sighting", () => {
    const card = sightingCard(sighting, tiger);
    expect(card.querySelector("img")?.getAttribute("src")).toBe("https://example.org/tiger.jpg");
    expect(card.querySelector("h3")?.textContent).toBe("Tiger");
    expect(card.querySelector(".sighting-card__taxon")?.textContent).toBe("Panthera tigris");
    expect(card.querySelector(".status-badge")?.textContent).toBe("Endangered");
    expect(card.querySelector("dl")?.textContent).toBe("Seen2025-03-01WhereMaharashtra, IndiaObserverA. Ranger");
    expect(hrefs(card)).toEqual([
      "https://creativecommons.org/licenses/by/4.0/",
      "#/species/5219416",
      "https://www.gbif.org/occurrence/7",
    ]);
  });

  it("names the subspecies when the sighting was identified to one", () => {
    const card = sightingCard({ ...sighting, taxonKey: 7059276 }, tiger);
    expect(card.querySelector("dl")?.textContent).toMatch(/^SubspeciesBengal tigerSeen/);
    expect(card.querySelector("dd a")?.getAttribute("href")).toBe("#/subspecies/7059276");
  });

  it("uses the scientific name for a subspecies without a common name", () => {
    const card = sightingCard({ ...sighting, taxonKey: 5219422 }, tiger);
    expect(card.querySelector("dd em")?.textContent).toBe("Panthera tigris sondaica");
  });

  it("shows the scientific name when the species is unknown", () => {
    const card = sightingCard(sighting);
    expect(card.querySelector("h3")?.textContent).toBe("Panthera tigris");
    expect(card.querySelector(".sighting-card__taxon")).toBeNull();
  });

  it("falls back gracefully when optional details are missing", () => {
    const card = sightingCard({ ...sighting, photo: undefined, date: undefined, place: "", observer: undefined }, tiger);
    expect(card.querySelector("figure")).toBeNull();
    expect(card.querySelector("dl")?.textContent).toBe("SeenDate unknownWhere21.512, 79.123");
  });
});
