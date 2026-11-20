import { routes, type Route } from "../router";
import { el } from "./dom";
import { themeToggle } from "./theme";

export interface Shell {
  outlet: HTMLElement;
  setActive(route: Route): void;
}

export function renderShell(root: HTMLElement): Shell {
  const homeLink = el("a", { href: routes.home(), className: "tab" }, "Today");
  const mapLink = el("a", { href: routes.map(), className: "tab" }, "Field Map");
  const bookLink = el("a", { href: routes.contents(), className: "tab" }, "Field Guide");
  const quizLink = el("a", { href: routes.quiz(), className: "tab" }, "Quiz");
  const outlet = el("main", { className: "outlet" });

  root.replaceChildren(
    el(
      "header",
      { className: "masthead" },
      el("div", { className: "masthead__title" }, el("h1", {}, "Still Roaming"), el("p", {}, "Endangered Mammal Occurrence Tracker")),
      el("nav", { className: "tabs" }, homeLink, mapLink, bookLink, quizLink),
      themeToggle(),
    ),
    outlet,
    el(
      "footer",
      { className: "colophon" },
      "Sightings from ",
      el("a", { href: "https://www.gbif.org", target: "_blank", rel: "noopener" }, "GBIF"),
      " · Species data from ",
      el("a", { href: "https://www.wikidata.org", target: "_blank", rel: "noopener" }, "Wikidata"),
      " and ",
      el("a", { href: "https://en.wikipedia.org", target: "_blank", rel: "noopener" }, "Wikipedia"),
      " · ",
      el("a", { href: routes.organizations() }, "Conservation organizations"),
      " · ",
      el("a", { href: "https://github.com/seanmburns00/StillRoaming", target: "_blank", rel: "noopener" }, "Source on GitHub"),
    ),
  );

  return {
    outlet,
    setActive(route) {
      homeLink.classList.toggle("tab--active", route.view === "home");
      mapLink.classList.toggle("tab--active", route.view === "map");
      quizLink.classList.toggle("tab--active", route.view === "quiz");
      bookLink.classList.toggle("tab--active", ["contents", "chapter", "species", "subspecies"].includes(route.view));
    },
  };
}
