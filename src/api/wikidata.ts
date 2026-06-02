import { WikidataQueries } from "../api/wikidata/wikidata.queries.js";
import { executeSparqlQuery } from "../services/wikidataService.js";
import { SpeciesMapper } from "../mappers/wikidata.mapper.js";
import { EXCLUDED_ORDERS } from "../constants/wikidata.constants.js";
import type { Species } from "../models/species.js";

export async function fetchEndangeredMammals(page: number = 1, pageSize: number = 12): Promise<Species[]> {
  const offset = (page - 1) * pageSize;
  const query = WikidataQueries.endangeredMammals(pageSize, offset);
  
  const bindings = await executeSparqlQuery(query);
  
  return bindings.map(b => SpeciesMapper.toSpecies(b, b.taxon_name?.value ?? "Unknown"));
}

export async function getFilteredMammals(page: number, includeSubspecies: boolean = true) {
  const limit = 60; 
  const offset = (page - 1) * limit;
  
  const query = WikidataQueries.endangeredMammals(limit, offset);
  const results = await executeSparqlQuery(query);

  const speciesList = results.map(b => 
    SpeciesMapper.toSpecies(b, b.taxon_name?.value ?? "Unknown")
  );

  const uniqueSpeciesMap = new Map<string, Species>();
  
  speciesList.forEach(species => {
    const isBannedOrder = EXCLUDED_ORDERS.some(orderId => species.parentIds.includes(orderId));
    
    // Check if it's a subspecies
    const isSubspecies = species.rank.toLowerCase().includes("subspecies");

    // Filtering Logic:
    // 1. Must not be in an excluded order
    // 2. If it's a subspecies, includeSubspecies must be true
    // 3. Must not be a duplicate taxon name
    const shouldInclude = !isBannedOrder && 
                          (includeSubspecies || !isSubspecies) && 
                          !uniqueSpeciesMap.has(species.taxonName);

    if (shouldInclude) {
      uniqueSpeciesMap.set(species.taxonName, species);
    }
  });

  return Array.from(uniqueSpeciesMap.values());
}

export async function fetchSpeciesData(scientificName: string): Promise<Species | null> {
  // 1. Get the raw query
  const query = WikidataQueries.speciesDetail(scientificName);
  
  // 2. Fetch the raw data
  const bindings = await executeSparqlQuery(query);
  
  // 3. Transform and return
  if (!bindings.length) return null;
  return SpeciesMapper.toSpecies(bindings[0], scientificName);
}