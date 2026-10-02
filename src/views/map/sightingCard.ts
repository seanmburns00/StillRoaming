import type { Sighting } from "../../models/sighting";
import type { SpeciesSummary } from "../../models/species";
import { routes } from "../../router";
import { el } from "../../ui/dom";
import { statusBadge } from "../../ui/statusBadge";

export function sightingCard(sighting: Sighting, species?: SpeciesSummary): HTMLElement {
  const { photo } = sighting;
  const subspecies = species?.subspecies.find((entry) => entry.gbifKey === sighting.taxonKey);
  return el(
    "article",
    { className: "sighting-card" },
    photo &&
      el(
        "figure",
        {},
        el("img", { src: photo.url, alt: `Photo of ${species?.commonName ?? sighting.scientificName}` }),
        el(
          "figcaption",
          {},
          `© ${photo.credit ?? "Unknown"}`,
          photo.license && " · ",
          photo.license && el("a", { href: photo.license, target: "_blank", rel: "noopener" }, "license"),
        ),
      ),
    el("h3", {}, species?.commonName ?? el("em", {}, sighting.scientificName)),
    species && el("p", { className: "sighting-card__taxon" }, el("em", {}, sighting.scientificName)),
    statusBadge(sighting.category),
    el(
      "dl",
      {},
      subspecies && el("dt", {}, "Subspecies"),
      subspecies && el("dd", {}, el("a", { href: routes.subspecies(subspecies.gbifKey) }, subspecies.commonName ?? el("em", {}, subspecies.taxonName))),
      el("dt", {}, "Seen"),
      el("dd", {}, sighting.date ?? "Date unknown"),
      el("dt", {}, "Where"),
      el("dd", {}, sighting.place || `${sighting.lat.toFixed(3)}, ${sighting.lng.toFixed(3)}`),
      sighting.observer && el("dt", {}, "Observer"),
      sighting.observer && el("dd", {}, sighting.observer),
    ),
    el(
      "p",
      { className: "sighting-card__links" },
      el("a", { href: routes.species(sighting.speciesKey) }, "Read in the field guide"),
      " · ",
      el("a", { href: sighting.gbifUrl, target: "_blank", rel: "noopener" }, "GBIF record"),
    ),
  );
}
