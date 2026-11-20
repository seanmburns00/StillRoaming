import { mkdir, writeFile } from "node:fs/promises";
import "./politeFetch";
import { buildSpeciesIndex } from "../src/data/buildSpeciesIndex";

const OUTPUT_FILE = new URL("../public/species-index.json", import.meta.url);
const startedAt = Date.now();
const index = await buildSpeciesIndex();
await mkdir(new URL(".", OUTPUT_FILE), { recursive: true });
await writeFile(OUTPUT_FILE, JSON.stringify(index));
const subspeciesCount = index.species.reduce((total, species) => total + species.subspecies.length, 0);
console.log(
  `Wrote ${index.species.length} species and ${subspeciesCount} subspecies in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`,
);
