import { fetchSpeciesIndex } from "../../api/speciesIndex";
import { MAMMAL_ORDERS } from "../../config";
import type { SpeciesSummary } from "../../models/species";
import { routes } from "../../router";
import { el } from "../../ui/dom";
import { speciesCountLabel } from "../../ui/labels";
import { searchCatalog } from "./catalog";
import { speciesGrid } from "./speciesGrid";

export function mountContentsView(outlet: HTMLElement): () => void {
  let disposed = false;
  let index: SpeciesSummary[] | undefined;

  const search = el("input", { type: "search", placeholder: "Search every chapter by common or scientific name…", className: "search" });
  const status = el("p", { className: "book-status", role: "status" });
  const results = el("div", { className: "search-results" });
  const chapters = MAMMAL_ORDERS.map((order) => ({ order, count: el("span", { className: "toc__count" }, "…") }));
  const toc = el(
    "ol",
    { className: "toc" },
    ...chapters.map(({ order, count }) =>
      el(
        "li",
        {},
        el(
          "a",
          { href: routes.chapter(order.name), className: "toc__entry" },
          el("span", { className: "toc__title" }, order.title, " ", el("em", {}, order.name)),
          el("span", { className: "toc__leader" }),
          count,
        ),
      ),
    ),
  );

  outlet.append(
    el(
      "section",
      { className: "book" },
      el(
        "div",
        { className: "page page--single" },
        el("h2", {}, "Field Guide"),
        el("p", { className: "lede" }, "Mammals listed as Critically Endangered, Endangered or Vulnerable that have been photographed in the wild."),
        search,
        status,
        toc,
        results,
      ),
    ),
  );

  function render() {
    const text = search.value.trim();
    toc.hidden = text !== "";
    if (!text) {
      status.textContent = "";
      results.replaceChildren();
      return;
    }
    if (!index) {
      status.textContent = "Still gathering species…";
      return;
    }
    const matches = searchCatalog(index, text);
    status.textContent = matches.length ? `${speciesCountLabel(matches.length)} found.` : "No species match that search.";
    results.replaceChildren(speciesGrid(matches));
  }

  search.addEventListener("input", render);

  fetchSpeciesIndex()
    .then((loaded) => {
      if (disposed) return;
      index = loaded;
      chapters.forEach(({ order, count }) => {
        count.textContent = speciesCountLabel(loaded.filter((species) => species.order === order.name).length);
      });
      render();
    })
    .catch((error: unknown) => {
      if (disposed) return;
      console.error(error);
      chapters.forEach(({ count }) => (count.textContent = ""));
      status.textContent = "Couldn't gather the species list just now. Please refresh to try again.";
    });

  return () => {
    disposed = true;
  };
}
