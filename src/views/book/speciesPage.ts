import { fetchSpeciesIndex } from "../../api/speciesIndex";
import { fetchTaxonDetail } from "../../api/wikidata";
import { MAMMAL_ORDERS } from "../../config";
import type { SpeciesSummary, TaxonDetail } from "../../models/species";
import { routes } from "../../router";
import { el } from "../../ui/dom";
import { sightingsLabel } from "../../ui/labels";
import { statusBadge } from "../../ui/statusBadge";
import { backLink, description, mountBookPage, notFound, picturePage, referenceLinks } from "./bookPage";

export function mountSpeciesPage(outlet: HTMLElement, speciesKey: number): () => void {
  return mountBookPage(outlet, (signal) => loadPage(speciesKey, signal));
}

async function loadPage(speciesKey: number, signal: AbortSignal): Promise<HTMLElement[]> {
  const [index, detail] = await Promise.all([fetchSpeciesIndex(), fetchTaxonDetail(speciesKey, signal)]);
  const species = index.find((entry) => entry.gbifKey === speciesKey);
  if (!species) return notFound("This field guide has no page for that species.");

  const story = await description(detail, signal);
  const chapter = MAMMAL_ORDERS.find((order) => order.name === species.order);

  return [
    backLink(routes.chapter(species.order), chapter?.title ?? "contents"),
    el(
      "article",
      { className: "spread" },
      picturePage({
        name: species.commonName,
        imageUrl: detail?.imageUrl ?? species.imageUrl,
        caption: species.commonName,
        rangeMapUrl: detail?.rangeMapUrl,
      }),
      storyPage(species, detail, story),
    ),
  ];
}

function storyPage(species: SpeciesSummary, detail: TaxonDetail | null, story: string | undefined): HTMLElement {
  return el(
    "div",
    { className: "page page--right" },
    el("h2", {}, species.commonName),
    species.commonName !== species.taxonName && el("p", { className: "taxon" }, el("em", {}, species.taxonName)),
    statusBadge(species.category),
    el("p", { className: "sighting-total" }, `${sightingsLabel(species.sightings)} photographed in the wild on GBIF`),
    el("p", { className: "story" }, story ?? "No description available yet."),
    species.subspecies.length > 0 && subspeciesList(species),
    referenceLinks(routes.map(species.gbifKey), detail, species.gbifKey),
  );
}

function subspeciesList(species: SpeciesSummary): HTMLElement {
  return el(
    "p",
    { className: "subspecies" },
    el("strong", {}, "Subspecies sighted: "),
    ...species.subspecies.flatMap((entry, i) => [
      i > 0 && ", ",
      el("a", { href: routes.subspecies(entry.gbifKey) }, entry.commonName ?? entry.taxonName),
      ` (${entry.sightings.toLocaleString()})`,
    ]),
  );
}
