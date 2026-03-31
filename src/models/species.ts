export interface Species {
  taxonName: string                // Scientific name 
  label: string                    // Common name 
  description?: string             // Short description
  iucnStatus?: string              // IUCN Status
  wikipedia?: string               // Wiki Url
  commonNames: string[]            // Common Names (TODO remove)
  images: string[]                 // Images
  rangeMaps: string[]              // Range maps
  videos: string[]                 // Videos 
  audios: string[]                 // Audio Files
  population?: number              // Population Count
  populationPointInTime?: string   // Population Count Date
}