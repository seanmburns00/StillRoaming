import { describe, expect, it } from "vitest";
import type { SpeciesSummary } from "../models/species";
import { escapeHtml, sharePages } from "./sharePages";

const SITE = "https://example.github.io/StillRoaming/";
const tiger: SpeciesSummary = {
  gbifKey: 5219416,
  taxonName: "Panthera tigris",
  commonName: "Tiger",
  category: "EN",
  order: "Carnivora",
  sightings: 2785,
  imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Tiger.jpg?width=320",
  subspecies: [{ gbifKey: 7059276, taxonName: "Panthera tigris tigris", commonName: "Bengal tiger", sightings: 10 }],
};

describe("sharePages", () => {
  const [speciesPage, subspeciesPage] = sharePages([tiger], SITE);

  it("writes a page for each species and subspecies", () => {
    expect(sharePages([tiger], SITE).map((page) => page.path)).toEqual(["species/5219416/", "subspecies/7059276/"]);
  });

  it("describes the species for link previews", () => {
    expect(speciesPage!.html).toContain('<meta property="og:title" content="Tiger · Still Roaming" />');
    expect(speciesPage!.html).toContain('content="Endangered. 2,785 sightings photographed in the wild and shared on GBIF."');
    expect(speciesPage!.html).toContain('<meta property="og:url" content="https://example.github.io/StillRoaming/species/5219416/" />');
  });

  it("asks Commons for a preview-sized photo", () => {
    expect(speciesPage!.html).toContain('content="https://commons.wikimedia.org/wiki/Special:FilePath/Tiger.jpg?width=1200"');
  });

  it("sends visitors on to the page in the app", () => {
    expect(speciesPage!.html).toContain('<meta http-equiv="refresh" content="0; url=../../#/species/5219416" />');
    expect(subspeciesPage!.html).toContain('href="../../#/subspecies/7059276"');
  });

  it("names the parent species on subspecies pages and borrows its photo", () => {
    expect(subspeciesPage!.html).toContain("Bengal tiger · Still Roaming");
    expect(subspeciesPage!.html).toContain("A subspecies of the Tiger (Endangered).");
    expect(subspeciesPage!.html).toContain("og:image");
  });

  it("leaves out the image tags when there is no photo", () => {
    const [page] = sharePages([{ ...tiger, imageUrl: undefined, subspecies: [] }], SITE);
    expect(page!.html).not.toContain("og:image");
    expect(page!.html).not.toContain("twitter:card");
  });

  it("escapes names so they cannot break out of the markup", () => {
    const [page] = sharePages([{ ...tiger, commonName: 'Tiger"><script>alert(1)</script>', subspecies: [] }], SITE);
    expect(page!.html).not.toContain("<script>");
    expect(page!.html).toContain("Tiger&quot;&gt;&lt;script&gt;");
  });
});

describe("escapeHtml", () => {
  it("escapes ampersands first so entities are not double-escaped", () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
});
