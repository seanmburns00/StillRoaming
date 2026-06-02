/*
    * Wikidata api configuration and other constants.
*/

/* Uses WikiData Q Ids to exclude certain groups of mammals that are very numerous and less well-known. */
/* Excludes rodents, bats, and shrews for now since they are so numerous and often less well-known. */
/* Excludes Aquatic mammals too since they can be less relatable for a general audience. */
export const EXCLUDED_ORDERS = ['Q36396', 'Q28425', 'Q28425', 'Q160']; 

export const WIKIDATA_CONFIG = {
  ENDPOINT: "https://query.wikidata.org/sparql",
  USER_AGENT: "StillRoaming/1.0",
  ACCEPT_HEADER: "application/sparql-results+json",
} as const;

export interface WikidataBinding {
  [key: string]: { 
    value: string; 
    type: string; 
  };
}

export interface WikidataResponse {
  results: {
    bindings: WikidataBinding[];
  };
}