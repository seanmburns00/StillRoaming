import { categoryFromWikidataId } from "../models/iucn";
import type { TaxonDetail } from "../models/species";
import { getJson, secureUrl } from "./http";

const SPARQL_URL = "https://query.wikidata.org/sparql";
const ENTITY_PREFIX = "http://www.wikidata.org/entity/";

export type Binding = Record<string, { value: string } | undefined>;

interface SparqlResponse {
  results: { bindings: Binding[] };
}

export interface WikidataTaxon {
  taxonName: string;
  commonName?: string;
  imageUrl?: string;
}

async function runSparql(query: string, signal?: AbortSignal): Promise<Binding[]> {
  const response = await getJson<SparqlResponse>(SPARQL_URL, {
    method: "POST",
    body: new URLSearchParams({ query, format: "json" }),
    signal,
  });
  return response.results.bindings;
}

export function sparqlString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}

export function taxaByGbifKeyQuery(gbifKeys: number[]): string {
  return `
    SELECT ?gbifKey (SAMPLE(?name) AS ?taxonName) (SAMPLE(?englishLabel) AS ?label)
           (SAMPLE(?vernacular) AS ?vernacularName) (SAMPLE(?image) AS ?image)
    WHERE {
      VALUES ?gbifKey { ${gbifKeys.map((key) => sparqlString(String(key))).join(" ")} }
      ?species wdt:P846 ?gbifKey ;
               wdt:P225 ?name .
      OPTIONAL { ?species rdfs:label ?englishLabel . FILTER(LANG(?englishLabel) = "en") }
      OPTIONAL { ?species wdt:P1843 ?vernacular . FILTER(LANG(?vernacular) = "en") }
      OPTIONAL { ?species wdt:P18 ?image . }
    }
    GROUP BY ?gbifKey
  `;
}

export function taxonDetailQuery(gbifKey: number): string {
  return `
    SELECT ?species ?status ?statusLabel (SAMPLE(?description) AS ?description) (SAMPLE(?image) AS ?image)
           (SAMPLE(?rangeMap) AS ?rangeMap) (SAMPLE(?article) AS ?wikipedia)
    WHERE {
      ?species wdt:P846 ${sparqlString(String(gbifKey))} .
      OPTIONAL { ?species schema:description ?description . FILTER(LANG(?description) = "en") }
      OPTIONAL { ?species wdt:P18 ?image . }
      OPTIONAL { ?species wdt:P181 ?rangeMap . }
      OPTIONAL { ?article schema:about ?species ; schema:isPartOf <https://en.wikipedia.org/> . }
      OPTIONAL {
        ?species wdt:P141 ?status .
        ?status rdfs:label ?statusLabel . FILTER(LANG(?statusLabel) = "en")
      }
    }
    GROUP BY ?species ?status ?statusLabel
    LIMIT 1
  `;
}

export async function fetchWikidataTaxa(gbifKeys: number[]): Promise<Map<number, WikidataTaxon>> {
  if (gbifKeys.length === 0) return new Map();
  const bindings = await runSparql(taxaByGbifKeyQuery(gbifKeys));
  return new Map(
    bindings.flatMap((binding) => {
      const taxon = toWikidataTaxon(binding);
      return taxon ? [[Number(binding.gbifKey?.value), taxon] as const] : [];
    }),
  );
}

export async function fetchTaxonDetail(gbifKey: number, signal?: AbortSignal): Promise<TaxonDetail | null> {
  const [binding] = await runSparql(taxonDetailQuery(gbifKey), signal);
  return binding ? toTaxonDetail(binding) : null;
}

export function toWikidataTaxon(binding: Binding): WikidataTaxon | null {
  const taxonName = binding.taxonName?.value;
  if (!binding.gbifKey || !taxonName) return null;
  const label = binding.label?.value;
  const labelIsCommonName = label !== undefined && label.toLowerCase() !== taxonName.toLowerCase();
  return {
    taxonName,
    commonName: labelIsCommonName ? label : binding.vernacularName?.value,
    imageUrl: commonsImage(binding.image?.value, 320),
  };
}

export function toTaxonDetail(binding: Binding): TaxonDetail {
  const statusLabel = binding.statusLabel?.value;
  return {
    description: binding.description?.value,
    assessment: statusLabel
      ? { category: categoryFromWikidataId(entityId(binding.status?.value)), label: capitalize(statusLabel) }
      : undefined,
    imageUrl: commonsImage(binding.image?.value, 800),
    rangeMapUrl: commonsImage(binding.rangeMap?.value, 600),
    wikipediaUrl: secureUrl(binding.wikipedia?.value),
    wikidataUrl: secureUrl(binding.species?.value),
  };
}

function commonsImage(fileUrl: string | undefined, width: number): string | undefined {
  const url = secureUrl(fileUrl);
  return url && `${url}?width=${width}`;
}

function entityId(uri: string | undefined): string | undefined {
  return uri?.startsWith(ENTITY_PREFIX) ? uri.slice(ENTITY_PREFIX.length) : undefined;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
