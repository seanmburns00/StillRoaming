import { mkdir, readFile, writeFile } from "node:fs/promises";
import { SITE_URL } from "../src/config";
import { sharePages } from "../src/data/sharePages";
import type { SpeciesIndex } from "../src/models/species";

const INDEX_FILE = new URL("../dist/species-index.json", import.meta.url);
const DIST = new URL("../dist/", import.meta.url);

const index = JSON.parse(await readFile(INDEX_FILE, "utf8")) as SpeciesIndex;
const pages = sharePages(index.species, SITE_URL);
for (const page of pages) {
  const directory = new URL(page.path, DIST);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL("index.html", directory), page.html);
}
console.log(`Wrote ${pages.length} share pages`);
