import { fetchSpeciesIndex } from "../../api/speciesIndex";
import { MAMMAL_ORDERS } from "../../config";
import { routes } from "../../router";
import { el } from "../../ui/dom";
import { speciesCountLabel } from "../../ui/labels";
import { speciesGrid } from "./speciesGrid";

export function mountChapterView(outlet: HTMLElement, orderName: string): () => void {
  let disposed = false;
  const order = MAMMAL_ORDERS.find((candidate) => candidate.name === orderName);
  const backLink = el("a", { href: routes.contents(), className: "back-link" }, "← Back to contents");

  if (!order) {
    outlet.append(
      el("section", { className: "book" }, backLink, el("div", { className: "page page--single" }, el("p", { className: "book-status" }, "This field guide has no chapter called ", el("em", {}, orderName), "."))),
    );
    return () => {};
  }

  const status = el("p", { className: "book-status", role: "status" }, "Gathering species…");
  const species = el("div");
  outlet.append(
    el(
      "section",
      { className: "book" },
      backLink,
      el("div", { className: "page page--single" }, el("h2", {}, order.title), el("p", { className: "lede" }, el("em", {}, order.name)), status, species),
    ),
  );

  fetchSpeciesIndex()
    .then((index) => {
      if (disposed) return;
      const chapter = index.filter((entry) => entry.order === order.name);
      status.textContent = chapter.length ? `${speciesCountLabel(chapter.length)}, alphabetical by name.` : "No species in this chapter yet.";
      species.replaceChildren(speciesGrid(chapter));
    })
    .catch((error: unknown) => {
      if (disposed) return;
      console.error(error);
      status.textContent = "Couldn't gather the species list just now. Please refresh to try again.";
    });

  return () => {
    disposed = true;
  };
}
