import { WIKIDATA_CONFIG, type WikidataBinding } from "../constants/wikidata.constants.js";

/**
 * A central, private utility to perform SPARQL requests.
*/
export async function executeSparqlQuery(query: string): Promise<WikidataBinding[]> {
  const url = `${WIKIDATA_CONFIG.ENDPOINT}?format=json&query=${encodeURIComponent(query)}`;
  
  const response = await fetch(url, {
    headers: {
      "Accept": WIKIDATA_CONFIG.ACCEPT_HEADER,
      "User-Agent": WIKIDATA_CONFIG.USER_AGENT
    }
  });

  if (!response.ok) {
    // Standardizing your error messages here makes debugging much easier
    throw new Error(`Wikidata Query Failed: ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();
  return data.results.bindings;
}