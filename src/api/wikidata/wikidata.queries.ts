/**
 * A collection of SPARQL queries for Wikidata.
 * Acts like a static provider for raw query strings.
*/
export const WikidataQueries = {

    /**
     * Retrieves a list of endangered mammals with basic info.
    */
    endangeredMammals: (limit: number = 10, offset: number = 0) => `
      SELECT DISTINCT 
        ?q_code 
        ?speciesLabel 
        ?taxon_name 
        ?rankLabel
        (GROUP_CONCAT(DISTINCT ?parent_q; SEPARATOR=" ") AS ?all_parent_ids)
        (GROUP_CONCAT(DISTINCT ?image_url; SEPARATOR=", ") AS ?image)
      WHERE {
        # --- Filter by Genus Panthera ---
        ?species wdt:P171* wd:Q127960 .
        
        # Basic Filters (Endangered, Critically Endangered, Vulnerable)
        ?species wdt:P141 ?status .
        FILTER(?status IN (
          wd:Q96377276, # Endangered
          wd:Q219127,   # Critically Endangered
          wd:Q278113    # Vulnerable
        ))

        # --- Get Taxonomic Rank (Species vs Subspecies) ---
        #?species wdt:P171* wd:Q7377 . Not currently needed
        #?species wdt:P105 wd:Q7432 .  Not currently needed
        ?species wdt:P105 ?rank .
        ?species wdt:P225 ?taxon_name .
        
        # Get parent IDs for order filtering
        ?species wdt:P171* ?parent . 

        BIND(STRAFTER(STR(?species), "http://www.wikidata.org/entity/") AS ?q_code)
        BIND(STRAFTER(STR(?parent), "http://www.wikidata.org/entity/") AS ?parent_q)

        # Optional Image Handling
        OPTIONAL { ?species wdt:P18 ?image_url . }
        
        # Fetch labels for the species and the rank (e.g., "subspecies")
        SERVICE wikibase:label { 
          bd:serviceParam wikibase:language "en". 
          ?species rdfs:label ?speciesLabel .
          ?rank rdfs:label ?rankLabel .
        }
      }
      GROUP BY ?q_code ?speciesLabel ?taxon_name ?rankLabel
      ORDER BY ?taxon_name
      LIMIT ${limit}
      OFFSET ${offset}
    `.trim(),

    /**
     * Retrieves full details for a specific taxon by its scientific name.
    */
    speciesDetail: (taxonName: string) => `
    SELECT
      ?species ?taxonName ?speciesLabel ?description ?iucnLabel ?wikipedia
      (GROUP_CONCAT(DISTINCT ?commonName; separator=", ") AS ?commonNames)
      (GROUP_CONCAT(DISTINCT ?image; separator=", ") AS ?images)
      (GROUP_CONCAT(DISTINCT ?rangeMap; separator=", ") AS ?rangeMaps)
      (GROUP_CONCAT(DISTINCT ?video; separator=", ") AS ?videos)
      (GROUP_CONCAT(DISTINCT ?audio; separator=", ") AS ?audios)
      (SAMPLE(?populationValue) AS ?population)
      (SAMPLE(?pointInTime) AS ?populationPointInTime)
    WHERE {
      ?species wdt:P225 "${taxonName}".
      ?species wdt:P225 ?taxonName.

      OPTIONAL {
        ?species schema:description ?description.
        FILTER (lang(?description) = "en")
      }
      OPTIONAL { ?species wdt:P141 ?iucn. }
      OPTIONAL {
        ?species wdt:P1843 ?commonName.
        FILTER (lang(?commonName) = "en")
      }
      OPTIONAL { ?species wdt:P18 ?image. }
      OPTIONAL { ?species wdt:P181 ?rangeMap. }
      OPTIONAL { ?species wdt:P10 ?video. }
      OPTIONAL { ?species wdt:P51 ?audio. }

      # Population Data
      OPTIONAL {
        ?species p:P1082 ?popStatement.
        ?popStatement ps:P1082 ?populationValue.
        OPTIONAL { ?popStatement pq:P585 ?pointInTime. }
      }

      OPTIONAL {
        ?wikipedia schema:about ?species ;
                   schema:isPartOf <https://en.wikipedia.org/> .
      }

      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    GROUP BY ?species ?taxonName ?speciesLabel ?description ?iucnLabel ?wikipedia
  `.trim()
};