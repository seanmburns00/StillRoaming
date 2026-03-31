import type { Species } from "../models/species.js"

const ENDPOINT = "https://query.wikidata.org/sparql"

function buildSpeciesQuery(taxonName: string): string {
  return `
    SELECT
      ?species
      ?taxonName
      ?speciesLabel
      ?description
      ?iucnLabel
      ?wikipedia
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

      # Population
      OPTIONAL {
        ?species p:P1082 ?popStatement.
        ?popStatement ps:P1082 ?populationValue.
        OPTIONAL { ?popStatement pq:P585 ?pointInTime. }
      }

      OPTIONAL {
        ?wikipedia schema:about ?species ;
                  schema:isPartOf <https://en.wikipedia.org/> .
      }

      SERVICE wikibase:label {
        bd:serviceParam wikibase:language "en".
      }
    }

    GROUP BY
      ?species
      ?taxonName
      ?speciesLabel
      ?description
      ?iucnLabel
      ?wikipedia
  `
}

export async function fetchEndangeredMammalTaxonNames(): Promise<string[]> {
  const query = `
    SELECT DISTINCT ?taxon ?taxon_name ?common_name
    WHERE {
      # Filter for IUCN conservation status (P141)
      # Vulnerable = wd:Q278113
      ?taxon wdt:P141 ?status .
      FILTER(?status = wd:Q11394 || ?status = wd:Q219127)
      
      # Must be specifically at the "Species" rank (Q7432)
      ?taxon wdt:P105 wd:Q7432 .
      
      # Must be a member of the Mammalia (Q7377) taxon tree
      ?taxon wdt:P171* wd:Q7377 .
      
      # Retrieve the scientific name
      ?taxon wdt:P225 ?taxon_name .
      
      # Retrieve the English common name
      OPTIONAL {
        ?taxon rdfs:label ?common_name .
        FILTER(LANG(?common_name) = "en")
      }
    }
    ORDER BY ?taxon_name
    LIMIT 2
  `

  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`

  const response = await fetch(url, {
    headers: {
      "Accept": "application/sparql-results+json",
      "User-Agent": "EndangeredMammalsExplorer/1.0"
    }
  })

  if (!response.ok) {
    throw new Error(`Wikidata error: ${response.status}`)
  }

  const data = await response.json()

  return data.results.bindings
    .map((b: any) => b.taxonName?.value)
    .filter(Boolean)
}

function splitMedia(value?: string): string[] {
  return value ? value.split(", ").filter(Boolean) : []
}

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

export async function fetchSpeciesData(scientificName: string): Promise<Species | null> {
  const query = buildSpeciesQuery(scientificName)
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`

  const response = await fetch(url, {
    headers: {
      "Accept": "application/sparql-results+json",
      "User-Agent": "EndangeredMammalsExplorer/1.0"
    }
  })

  if (!response.ok) {
    throw new Error(`Wikidata error: ${response.status}`)
  }

  const data = await response.json()
  const result = data.results.bindings[0]
  if (!result) return null

  return {
    taxonName: titleCase(result.taxonName?.value ?? scientificName),
    label: titleCase(result.speciesLabel?.value ?? scientificName),
    description: result.description?.value,
    iucnStatus: result.iucnLabel?.value,
    wikipedia: result.wikipedia?.value,
    commonNames: splitMedia(result.commonNames?.value).map(titleCase),
    images: splitMedia(result.images?.value),
    rangeMaps: splitMedia(result.rangeMaps?.value),
    videos: splitMedia(result.videos?.value),
    audios: splitMedia(result.audios?.value),
    population: result.population?.value ? Number(result.population.value) : undefined,
    populationPointInTime: result.populationPointInTime?.value
  }
}