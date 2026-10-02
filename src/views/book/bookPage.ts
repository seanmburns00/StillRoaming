import { fetchWikipediaExtract } from "../../api/wikipedia";
import type { TaxonDetail } from "../../models/species";
import { routes } from "../../router";
import { el } from "../../ui/dom";

export function mountBookPage(outlet: HTMLElement, load: (signal: AbortSignal) => Promise<HTMLElement[]>): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  const content = el("div", { className: "book" }, el("p", { className: "book-status" }, "Turning to the page…"));
  outlet.append(content);

  load(signal)
    .then((page) => {
      if (!signal.aborted) content.replaceChildren(...page);
    })
    .catch((error: unknown) => {
      if (signal.aborted) return;
      console.error(error);
      content.replaceChildren(
        backLink(routes.contents(), "contents"),
        el("p", { className: "book-status" }, "Couldn't reach the species records just now. Please refresh to try again."),
      );
    });

  return () => controller.abort();
}

export function backLink(href: string, label: string): HTMLAnchorElement {
  return el("a", { href, className: "back-link" }, `← Back to ${label}`);
}

export function notFound(message: string): HTMLElement[] {
  return [backLink(routes.contents(), "contents"), el("p", { className: "book-status" }, message)];
}

export async function description(detail: TaxonDetail | null, signal: AbortSignal): Promise<string | undefined> {
  const extract = detail?.wikipediaUrl
    ? await fetchWikipediaExtract(detail.wikipediaUrl, signal).catch(() => undefined)
    : undefined;
  return extract ?? detail?.description;
}

export function picturePage(plate: { name: string; imageUrl?: string; caption: string; rangeMapUrl?: string }): HTMLElement {
  return el(
    "div",
    { className: "page page--left" },
    plate.imageUrl
      ? el("figure", { className: "plate" }, el("img", { src: plate.imageUrl, alt: plate.caption }), el("figcaption", {}, plate.caption))
      : el("p", { className: "plate plate--empty" }, "No photograph on file."),
    plate.rangeMapUrl &&
      el(
        "figure",
        { className: "plate plate--map" },
        el("img", { src: plate.rangeMapUrl, alt: `Range map for ${plate.name}`, loading: "lazy" }),
        el("figcaption", {}, "Known range"),
      ),
  );
}

export function referenceLinks(mapHref: string, detail: TaxonDetail | null, gbifKey: number): HTMLUListElement {
  const external = (href: string, label: string) => el("li", {}, el("a", { href, target: "_blank", rel: "noopener" }, label));
  return el(
    "ul",
    { className: "page-links" },
    el("li", {}, el("a", { href: mapHref }, "See recent sightings on the field map")),
    detail?.wikipediaUrl && external(detail.wikipediaUrl, "Read more on Wikipedia"),
    detail?.wikidataUrl && external(detail.wikidataUrl, "Wikidata entry"),
    external(`https://www.gbif.org/species/${gbifKey}`, "GBIF species page"),
  );
}
