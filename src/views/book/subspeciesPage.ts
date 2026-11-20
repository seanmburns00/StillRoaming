import { fetchSpeciesIndex, findSubspecies } from "../../api/speciesIndex";
import { fetchTaxonDetail } from "../../api/wikidata";
import type { SpeciesSummary, SubspeciesSummary, TaxonDetail } from "../../models/species";
import { routes } from "../../router";
import { el } from "../../ui/dom";
import { sightingsLabel } from "../../ui/labels";
import { statusBadge } from "../../ui/statusBadge";
import { sightingTrend } from "../../ui/trendChart";
import { backLink, description, mountBookPage, notFound, picturePage, referenceLinks } from "./bookPage";

export function mountSubspeciesPage(outlet: HTMLElement, subspeciesKey: number): () => void {
  return mountBookPage(outlet, (signal) => loadPage(subspeciesKey, signal));
}

async function loadPage(subspeciesKey: number, signal: AbortSignal): Promise<HTMLElement[]> {
  const [index, detail] = await Promise.all([fetchSpeciesIndex(), fetchTaxonDetail(subspeciesKey, signal)]);
  const found = findSubspecies(index, subspeciesKey);
  if (!found) return notFound("This field guide has no page for that subspecies.");

  const { species, subspecies } = found;
  const name = subspecies.commonName ?? subspecies.taxonName;
  const story = await description(detail, signal);

  return [
    backLink(routes.species(species.gbifKey), species.commonName),
    el(
      "article",
      { className: "spread" },
      picturePage({
        name,
        imageUrl: detail?.imageUrl ?? species.imageUrl,
        caption: detail?.imageUrl ? name : `${species.commonName} (photo of the species)`,
        rangeMapUrl: detail?.rangeMapUrl,
      }),
      storyPage(species, subspecies, detail, story, signal),
    ),
  ];
}

function storyPage(
  species: SpeciesSummary,
  subspecies: SubspeciesSummary,
  detail: TaxonDetail | null,
  story: string | undefined,
  signal: AbortSignal,
): HTMLElement {
  return el(
    "div",
    { className: "page page--right" },
    el("h2", {}, subspecies.commonName ?? el("em", {}, subspecies.taxonName)),
    subspecies.commonName && el("p", { className: "taxon" }, el("em", {}, subspecies.taxonName)),
    el("p", { className: "parent-species" }, "A subspecies of ", el("a", { href: routes.species(species.gbifKey) }, species.commonName)),
    el("p", { className: "status-line" }, el("span", { className: "status-line__label" }, "Species status"), statusBadge(species.category)),
    detail?.assessment &&
      el(
        "p",
        { className: "status-line" },
        el("span", { className: "status-line__label" }, "Subspecies assessed separately"),
        statusBadge(detail.assessment.category, detail.assessment.label),
        el("span", { className: "status-line__source" }, "IUCN, via Wikidata"),
      ),
    el("p", { className: "sighting-total" }, `${sightingsLabel(subspecies.sightings)} photographed in the wild on GBIF`),
    el("p", { className: "story" }, story ?? "No description available yet."),
    sightingTrend({ speciesKeys: [], subspeciesKeys: [subspecies.gbifKey] }, signal),
    referenceLinks(routes.map({ subspeciesKey: subspecies.gbifKey }), detail, subspecies.gbifKey),
  );
}
