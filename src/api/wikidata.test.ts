import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchTaxonDetail,
  fetchWikidataTaxa,
  sparqlString,
  taxonDetailQuery,
  taxaByGbifKeyQuery,
  toTaxonDetail,
  toWikidataTaxon,
  type Binding,
} from "./wikidata";

const ENTITY = "http://www.wikidata.org/entity/";

function binding(values: Record<string, string>): Binding {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, { value }]));
}

function sparqlResponse(bindings: Binding[]): Response {
  return new Response(JSON.stringify({ results: { bindings } }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sparqlString", () => {
  it("quotes a plain value", () => {
    expect(sparqlString("5219416")).toBe('"5219416"');
  });

  it("escapes quotes, backslashes and line breaks so a value cannot break out of the literal", () => {
    expect(sparqlString('a" . } DELETE {')).toBe('"a\\" . } DELETE {"');
    expect(sparqlString("a\\")).toBe('"a\\\\"');
    expect(sparqlString("a\nb\rc")).toBe('"a\\nb\\rc"');
  });
});

describe("queries", () => {
  it("looks up every requested species by its GBIF ID", () => {
    expect(taxaByGbifKeyQuery([5219416, 2435099])).toContain('VALUES ?gbifKey { "5219416" "2435099" }');
    expect(taxaByGbifKeyQuery([1])).toContain("wdt:P846 ?gbifKey");
  });

  it("keeps the Wikipedia join out of the bulk query, since it makes the query several times slower", () => {
    expect(taxaByGbifKeyQuery([1])).not.toContain("wikipedia");
    expect(taxonDetailQuery(5219416)).toContain("schema:isPartOf <https://en.wikipedia.org/>");
  });

  it("looks up a single species page by its GBIF ID", () => {
    expect(taxonDetailQuery(5219416)).toContain('wdt:P846 "5219416"');
  });
});

describe("toWikidataTaxon", () => {
  it("maps a bulk lookup row", () => {
    const row = binding({
      gbifKey: "5219416",
      taxonName: "Panthera tigris",
      label: "tiger",
      image: "http://commons.wikimedia.org/wiki/Special:FilePath/Tiger.jpg",
    });
    expect(toWikidataTaxon(row)).toEqual({
      taxonName: "Panthera tigris",
      commonName: "tiger",
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Tiger.jpg?width=320",
    });
  });

  it("uses the taxon common name when the label is just the scientific name", () => {
    const row = binding({ gbifKey: "1", taxonName: "Okapia johnstoni", label: "Okapia johnstoni", vernacularName: "Okapi" });
    expect(toWikidataTaxon(row)?.commonName).toBe("Okapi");
  });

  it("prefers a real label over the taxon common name", () => {
    const row = binding({ gbifKey: "1", taxonName: "Diceros bicornis", label: "black rhinoceros", vernacularName: "Hook-lipped rhinoceros" });
    expect(toWikidataTaxon(row)?.commonName).toBe("black rhinoceros");
  });

  it("has no common name when the label is the scientific name and there is no taxon common name", () => {
    expect(toWikidataTaxon(binding({ gbifKey: "1", taxonName: "Ateles belzebuth", label: "ateles belzebuth" }))?.commonName).toBeUndefined();
  });

  it("leaves the common name and image empty when Wikidata has none", () => {
    expect(toWikidataTaxon(binding({ gbifKey: "1", taxonName: "Hylobates abbotti" }))).toEqual({
      taxonName: "Hylobates abbotti",
      commonName: undefined,
      imageUrl: undefined,
    });
  });

  it("skips rows without a scientific name", () => {
    expect(toWikidataTaxon(binding({ gbifKey: "1" }))).toBeNull();
  });
});

describe("toTaxonDetail", () => {
  it("maps a detail row", () => {
    const row = binding({
      species: `${ENTITY}Q19939`,
      description: "species of big cat",
      image: "http://commons.wikimedia.org/wiki/Special:FilePath/Tiger.jpg",
      rangeMap: "http://commons.wikimedia.org/wiki/Special:FilePath/Tiger%20distribution.png",
      wikipedia: "https://en.wikipedia.org/wiki/Tiger",
    });
    expect(toTaxonDetail(row)).toEqual({
      description: "species of big cat",
      assessment: undefined,
      imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Tiger.jpg?width=800",
      rangeMapUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Tiger%20distribution.png?width=600",
      wikipediaUrl: "https://en.wikipedia.org/wiki/Tiger",
      wikidataUrl: "https://www.wikidata.org/entity/Q19939",
    });
  });
});

describe("toTaxonDetail assessment", () => {
  it("keeps the IUCN assessment, with a category when it is one we track", () => {
    const row = binding({ species: `${ENTITY}Q1`, status: `${ENTITY}Q219127`, statusLabel: "critically endangered" });
    expect(toTaxonDetail(row).assessment).toEqual({ category: "CR", label: "Critically endangered" });
  });

  it("keeps other assessments as a label only", () => {
    const row = binding({ species: `${ENTITY}Q1`, status: `${ENTITY}Q211005`, statusLabel: "least concern" });
    expect(toTaxonDetail(row).assessment).toEqual({ category: undefined, label: "Least concern" });
  });

  it("has no assessment when Wikidata has none", () => {
    expect(toTaxonDetail(binding({ species: `${ENTITY}Q1` })).assessment).toBeUndefined();
  });
});

describe("fetchWikidataTaxa", () => {
  it("returns taxa keyed by GBIF ID", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sparqlResponse([
          binding({ gbifKey: "5219416", taxonName: "Panthera tigris", label: "tiger" }),
          binding({ gbifKey: "2435099", taxonName: "Panthera leo" }),
        ]),
      ),
    );
    const taxa = await fetchWikidataTaxa([5219416, 2435099, 999]);
    expect([...taxa.keys()]).toEqual([5219416, 2435099]);
    expect(taxa.get(5219416)?.commonName).toBe("tiger");
  });

  it("sends the query as a form POST so a long list of IDs fits and no CORS preflight is needed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sparqlResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    await fetchWikidataTaxa([5219416]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://query.wikidata.org/sparql");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(URLSearchParams);
    expect((init.body as URLSearchParams).get("format")).toBe("json");
  });

  it("skips the request when there is nothing to look up", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchWikidataTaxa([])).resolves.toEqual(new Map());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("fetchTaxonDetail", () => {
  it("returns null when Wikidata has no matching species", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sparqlResponse([])));
    await expect(fetchTaxonDetail(999)).resolves.toBeNull();
  });
});
