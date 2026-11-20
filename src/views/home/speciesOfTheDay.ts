import type { SpeciesSummary } from "../../models/species";

const DAY_MS = 24 * 60 * 60 * 1000;
const PRIME_STRIDE = 7919;

export function speciesOfTheDay(index: SpeciesSummary[], today: Date): SpeciesSummary | undefined {
  const candidates = index.filter((species) => species.imageUrl);
  if (candidates.length === 0) return undefined;
  const day = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / DAY_MS);
  return candidates[(day * PRIME_STRIDE) % candidates.length];
}
