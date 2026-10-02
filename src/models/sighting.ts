import type { IucnCategory } from "./iucn";

export interface Photo {
  url: string;
  credit?: string;
  license?: string;
}

export interface Sighting {
  id: number;
  speciesKey: number;
  taxonKey?: number;
  scientificName: string;
  category: IucnCategory;
  lat: number;
  lng: number;
  date?: string;
  place: string;
  observer?: string;
  photo?: Photo;
  gbifUrl: string;
}
