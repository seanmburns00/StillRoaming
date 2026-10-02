import type { SpeciesSummary } from "../../models/species";
import { routes } from "../../router";
import { el } from "../../ui/dom";
import { statusBadge } from "../../ui/statusBadge";
import { sightingsLabel } from "../../ui/labels";

export function speciesGrid(species: SpeciesSummary[]): HTMLUListElement {
  return el("ul", { className: "species-list" }, ...species.map(speciesEntry));
}

function speciesEntry(species: SpeciesSummary): HTMLLIElement {
  return el(
    "li",
    {},
    el(
      "a",
      { href: routes.species(species.gbifKey), className: "species-entry" },
      species.imageUrl
        ? el("img", { src: species.imageUrl, alt: "", loading: "lazy" })
        : el("span", { className: "species-entry__placeholder" }, "No photo"),
      el("span", { className: "species-entry__name" }, species.commonName),
      species.commonName !== species.taxonName && el("em", {}, species.taxonName),
      el("span", { className: "species-entry__sightings" }, sightingsLabel(species.sightings)),
      statusBadge(species.category),
    ),
  );
}
