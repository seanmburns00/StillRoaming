import type { MammalOrderName } from "../config";
import type { IucnCategory } from "./iucn";

export interface SubspeciesSummary {
  gbifKey: number;
  taxonName: string;
  commonName?: string;
  sightings: number;
}

export interface SpeciesSummary {
  gbifKey: number;
  taxonName: string;
  commonName: string;
  category: IucnCategory;
  order: MammalOrderName;
  sightings: number;
  imageUrl?: string;
  subspecies: SubspeciesSummary[];
}

export interface SpeciesIndex {
  generatedAt: string;
  species: SpeciesSummary[];
}

export interface TaxonDetail {
  description?: string;
  assessment?: { category?: IucnCategory; label: string };
  imageUrl?: string;
  rangeMapUrl?: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
}
