import { test as base, type Page } from "@playwright/test";
import type { SpeciesIndex, SpeciesSummary } from "../src/models/species";

const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

const photo = (name: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${name}.jpg?width=320`;

export const tiger: SpeciesSummary = {
  gbifKey: 5219416,
  taxonName: "Panthera tigris",
  commonName: "Tiger",
  category: "EN",
  order: "Carnivora",
  sightings: 2785,
  imageUrl: photo("Tiger"),
  subspecies: [{ gbifKey: 7059276, taxonName: "Panthera tigris tigris", commonName: "Bengal tiger", sightings: 900 }],
};
export const snowLeopard: SpeciesSummary = {
  gbifKey: 5219436,
  taxonName: "Panthera uncia",
  commonName: "Snow leopard",
  category: "VU",
  order: "Carnivora",
  sightings: 120,
  imageUrl: photo("Snow_leopard"),
  subspecies: [],
};
export const elephant: SpeciesSummary = {
  gbifKey: 2435350,
  taxonName: "Elephas maximus",
  commonName: "Asian elephant",
  category: "EN",
  order: "Proboscidea",
  sightings: 1500,
  imageUrl: photo("Elephant"),
  subspecies: [],
};
export const orangutan: SpeciesSummary = {
  gbifKey: 5219530,
  taxonName: "Pongo pygmaeus",
  commonName: "Bornean orangutan",
  category: "CR",
  order: "Primates",
  sightings: 400,
  imageUrl: photo("Orangutan"),
  subspecies: [],
};
export const speciesIndex: SpeciesIndex = { generatedAt: "2026-11-19T06:00:00.000Z", species: [elephant, orangutan, snowLeopard, tiger] };

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export const occurrences = [
  { key: 1001, species: tiger, lat: 21.5, lng: 79.2, age: 20, country: "India" },
  { key: 1002, species: orangutan, lat: 1.0, lng: 114.0, age: 10, country: "Indonesia" },
  { key: 1003, species: elephant, lat: -10.0, lng: -55.0, age: 2, country: "Brazil" },
].map(({ key, species, lat, lng, age, country }) => ({
  key,
  speciesKey: species.gbifKey,
  scientificName: species.taxonName,
  species: species.taxonName,
  decimalLatitude: lat,
  decimalLongitude: lng,
  eventDate: daysAgo(age),
  country,
  recordedBy: "A. Ranger",
  media: [{ type: "StillImage", identifier: `https://example.org/photos/${key}.jpg`, rightsHolder: "A. Ranger" }],
}));

async function mockApis(page: Page) {
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
  await page.route("**/species-index.json", (route) => route.fulfill({ json: speciesIndex }));
  await page.route("https://api.gbif.org/v1/occurrence/search/predicate", (route) => {
    const search = route.request().postDataJSON() as { facets?: string[] };
    if (search.facets?.includes("YEAR")) {
      const counts = [
        { name: "2024", count: 10 },
        { name: "2025", count: 20 },
      ];
      return route.fulfill({ json: { count: 30, results: [], facets: [{ field: "YEAR", counts }] } });
    }
    return route.fulfill({ json: { count: occurrences.length, results: occurrences, facets: [] } });
  });
  await page.route("https://query.wikidata.org/**", (route) => route.fulfill({ json: { results: { bindings: [] } } }));
  for (const images of ["https://commons.wikimedia.org/**", "https://example.org/**", "https://api.gbif.org/v2/map/**", "https://tile.openstreetmap.org/**"]) {
    await page.route(images, (route) => route.fulfill({ body: PIXEL, contentType: "image/png" }));
  }
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await mockApis(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
