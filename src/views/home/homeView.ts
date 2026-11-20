import { speciesScope } from "../../api/gbif";
import { fetchSpeciesIndex } from "../../api/speciesIndex";
import { fetchTaxonDetail } from "../../api/wikidata";
import { routes } from "../../router";
import { el } from "../../ui/dom";
import { sightingsLabel } from "../../ui/labels";
import { statusBadge } from "../../ui/statusBadge";
import { sightingTrend } from "../../ui/trendChart";
import { description, mountBookPage, picturePage } from "../book/bookPage";
import { speciesOfTheDay } from "./speciesOfTheDay";

export function mountHomeView(outlet: HTMLElement): () => void {
  return mountBookPage(outlet, async (signal) => {
    const index = await fetchSpeciesIndex();
    const species = speciesOfTheDay(index, new Date());
    const welcome = el(
      "div",
      { className: "page page--single welcome" },
      el("h2", {}, "Still roaming, for now"),
      el(
        "p",
        { className: "lede" },
        `${index.length.toLocaleString()} threatened mammal species have been photographed in the wild and shared on GBIF. See where they were seen this month or read up on each one.`,
      ),
      el(
        "p",
        { className: "welcome__actions" },
        el("a", { href: routes.map(), className: "button" }, "Open the field map"),
        el("a", { href: routes.contents(), className: "button" }, "Browse the field guide"),
      ),
    );
    if (!species) return [welcome];

    const detail = await fetchTaxonDetail(species.gbifKey, signal).catch(() => null);
    const story = await description(detail, signal);
    return [
      welcome,
      el(
        "article",
        { className: "spread" },
        picturePage({ name: species.commonName, imageUrl: detail?.imageUrl ?? species.imageUrl, caption: species.commonName }),
        el(
          "div",
          { className: "page page--right" },
          el("p", { className: "kicker" }, "Species of the day"),
          el("h2", {}, species.commonName),
          species.commonName !== species.taxonName && el("p", { className: "taxon" }, el("em", {}, species.taxonName)),
          statusBadge(species.category),
          el("p", { className: "sighting-total" }, `${sightingsLabel(species.sightings)} photographed in the wild on GBIF`),
          el("p", { className: "story" }, story ?? "No description available yet."),
          sightingTrend(speciesScope(species), signal),
          el(
            "ul",
            { className: "page-links" },
            el("li", {}, el("a", { href: routes.species(species.gbifKey) }, "Read the full field guide entry")),
            el("li", {}, el("a", { href: routes.map({ speciesKey: species.gbifKey }) }, "See recent sightings on the field map")),
          ),
        ),
      ),
    ];
  });
}
