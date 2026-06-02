export interface Species {
  // Essential fields
  taxonName: string                // Scientific name 
  label: string                    // Common name 
  images: string[]                 // Images
  rank: string                     // Taxonomic rank

  // Filterable/Relational fields
  parentIds: string[];

  // Optional/Extended fields
  description?: string             // Short description
  iucnStatus?: string              // IUCN Status
  wikipedia?: string               // Wiki Url
  rangeMaps: string[]              // Range maps
  videos: string[]                 // Videos 
  audios: string[]                 // Audio Files
  population?: number              // Population Count
  populationPointInTime?: string   // Population Count Date
}