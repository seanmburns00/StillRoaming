import type { SightingQuery } from "../../api/gbif";
import { ALL_IUCN_CATEGORIES, IUCN_CATEGORIES } from "../../models/iucn";
import { routes } from "../../router";
import { el } from "../../ui/dom";

export function filterPanel(
  initial: SightingQuery,
  onSearch: (query: SightingQuery) => void,
  speciesName: HTMLElement,
): HTMLFormElement {
  const from = el("input", { type: "date", value: initial.from, required: true });
  const to = el("input", { type: "date", value: initial.to, required: true });
  const checkboxes = ALL_IUCN_CATEGORIES.map((category) => ({
    category,
    input: el("input", { type: "checkbox", checked: initial.categories.includes(category) }),
  }));

  const form = el(
    "form",
    { className: "filters" },
    el("label", { className: "filters__date" }, "From ", from),
    el("label", { className: "filters__date" }, "To ", to),
    el(
      "fieldset",
      { className: "filters__statuses" },
      el("legend", {}, "Status"),
      ...checkboxes.map(({ category, input }) =>
        el("label", { className: `status-option status-option--${category}` }, input, IUCN_CATEGORIES[category].label),
      ),
    ),
    (initial.speciesKey !== undefined || initial.subspeciesKey !== undefined) &&
      el("p", { className: "filters__species" }, "Only ", speciesName, " ", el("a", { href: routes.map() }, "(show all)")),
    el("button", { type: "submit", className: "button" }, "Search sightings"),
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSearch({
      from: from.value,
      to: to.value,
      categories: checkboxes.filter(({ input }) => input.checked).map(({ category }) => category),
      speciesKey: initial.speciesKey,
      subspeciesKey: initial.subspeciesKey,
    });
  });

  return form;
}
