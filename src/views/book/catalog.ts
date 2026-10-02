import type { SpeciesSummary } from "../../models/species";

export function searchCatalog(catalog: SpeciesSummary[], text: string): SpeciesSummary[] {
  const needle = text.trim().toLowerCase();
  if (!needle) return catalog;
  return catalog.filter((species) =>
    [species.commonName, species.taxonName, ...species.subspecies.flatMap((entry) => [entry.commonName, entry.taxonName])].some(
      (name) => name?.toLowerCase().includes(needle),
    ),
  );
}
