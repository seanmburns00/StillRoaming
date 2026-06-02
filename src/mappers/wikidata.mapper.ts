import type { Species } from "../models/species.js";
import type { WikidataBinding } from "../constants/wikidata.constants.js";

export const SpeciesMapper = {
  // A helper to safely clean up the raw Wikidata values
  toSpecies(binding: WikidataBinding, fallbackName: string): Species {
    return {
        // Essential fields
        taxonName: this.titleCase(binding.taxon_name?.value ?? fallbackName),
        label: this.titleCase(binding.speciesLabel?.value ?? fallbackName),
        images: this.splitList(binding.image?.value),
        rank: binding.rankLabel?.value ?? "species",

        // Filterable/Relational fields
        parentIds: binding.all_parent_ids?.value ? binding.all_parent_ids.value.split(' ') : [],

        // Optional/Extended fields
        description: binding.description?.value ?? "",
        iucnStatus: binding.iucnLabel?.value ?? "Unknown",
        wikipedia: binding.wikipedia?.value,
        rangeMaps: this.splitList(binding.rangeMaps?.value),
        videos: this.splitList(binding.videos?.value),
        audios: this.splitList(binding.audios?.value),
        population: binding.population?.value ? Number(binding.population.value) : undefined,
        populationPointInTime: binding.populationPointInTime?.value
    };
  },

  splitList(value?: string): string[] {
    return value ? value.split(", ").filter(Boolean) : [];
  },

  titleCase(str: string): string {
    return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  }
};