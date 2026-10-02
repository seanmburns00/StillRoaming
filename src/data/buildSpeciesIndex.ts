import { fetchWikidataTaxa, type WikidataTaxon } from "../api/wikidata";
import { DOMESTICATED_SPECIES_KEYS, MAMMAL_ORDERS, type MammalOrderName } from "../config";
import type { IucnCategory } from "../models/iucn";
import type { SpeciesIndex, SpeciesSummary } from "../models/species";
import {
  fetchGbifTaxon,
  fetchSightingCounts,
  fetchSpeciesStatuses,
  fetchSubspecies,
  type GbifSubspecies,
  type GbifTaxon,
  type SightingCounts,
} from "./gbifSpecies";

export interface IndexSources {
  statuses: Map<number, IucnCategory>;
  subspecies: GbifSubspecies[];
  countsByOrder: { order: MammalOrderName; counts: SightingCounts }[];
  wikidata: Map<number, WikidataTaxon>;
  gbifTaxa: Map<number, GbifTaxon>;
}

export async function buildSpeciesIndex(now = new Date()): Promise<SpeciesIndex> {
  const [allStatuses, allSubspecies] = await Promise.all([
    fetchSpeciesStatuses(),
    Promise.all(MAMMAL_ORDERS.map((order) => fetchSubspecies(order.gbifKey))).then((lists) => lists.flat()),
  ]);
  const statuses = new Map([...allStatuses].filter(([speciesKey]) => !DOMESTICATED_SPECIES_KEYS.includes(speciesKey)));
  const subspecies = allSubspecies.filter((entry) => statuses.has(entry.speciesKey));
  const scope = { speciesKeys: [...statuses.keys()], subspeciesKeys: subspecies.map((entry) => entry.key) };

  const countsByOrder = await Promise.all(
    MAMMAL_ORDERS.map(async (order) => ({ order: order.name, counts: await fetchSightingCounts(order.gbifKey, scope) })),
  );
  const sightedSubspecies = subspecies.filter((entry) => countsByOrder.some(({ counts }) => (counts.byTaxon.get(entry.key) ?? 0) > 0));

  const wikidata = await fetchWikidataTaxa([...statuses.keys(), ...sightedSubspecies.map((entry) => entry.key)]);
  const unmatched = [...statuses.keys()].filter((speciesKey) => !wikidata.has(speciesKey));
  const gbifTaxa = new Map(await Promise.all(unmatched.map(async (speciesKey) => [speciesKey, await fetchGbifTaxon(speciesKey)] as const)));

  return {
    generatedAt: now.toISOString(),
    species: mergeSpecies({ statuses, subspecies: sightedSubspecies, countsByOrder, wikidata, gbifTaxa }),
  };
}

export function mergeSpecies({ statuses, subspecies, countsByOrder, wikidata, gbifTaxa }: IndexSources): SpeciesSummary[] {
  const subspeciesSightings = (key: number) =>
    countsByOrder.reduce((total, { counts }) => total + (counts.byTaxon.get(key) ?? 0), 0);

  return countsByOrder
    .flatMap(({ order, counts }) =>
      [...counts.bySpecies].flatMap(([speciesKey, sightings]): SpeciesSummary[] => {
        const category = statuses.get(speciesKey);
        const wikidataTaxon = wikidata.get(speciesKey);
        const gbifTaxon = gbifTaxa.get(speciesKey);
        const taxonName = wikidataTaxon?.taxonName ?? gbifTaxon?.canonicalName;
        if (!category || !taxonName) return [];

        return [
          {
            gbifKey: speciesKey,
            taxonName,
            commonName: capitalize(wikidataTaxon?.commonName ?? gbifTaxon?.vernacularName ?? taxonName),
            category,
            order,
            sightings,
            imageUrl: wikidataTaxon?.imageUrl,
            subspecies: subspecies
              .filter((entry) => entry.speciesKey === speciesKey)
              .sort((a, b) => subspeciesSightings(b.key) - subspeciesSightings(a.key))
              .map((entry) => {
                const commonName = wikidata.get(entry.key)?.commonName;
                return {
                  gbifKey: entry.key,
                  taxonName: entry.canonicalName,
                  commonName: commonName && capitalize(commonName),
                  sightings: subspeciesSightings(entry.key),
                };
              }),
          },
        ];
      }),
    )
    .sort((a, b) => a.commonName.localeCompare(b.commonName));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
