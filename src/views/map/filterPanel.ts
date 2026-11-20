import type { Nearby, SightingQuery } from "../../api/gbif";
import { COUNTRY_CODES } from "../../config";
import { ALL_IUCN_CATEGORIES, IUCN_CATEGORIES } from "../../models/iucn";
import { routes } from "../../router";
import { el } from "../../ui/dom";

export const NEARBY_DISTANCES_KM = [100, 500];
const ANYWHERE = "";

export function filterPanel(
  initial: SightingQuery,
  onSearch: (query: SightingQuery) => void,
  onStatus: (message: string) => void,
  speciesName: HTMLElement,
): HTMLFormElement {
  const from = el("input", { type: "date", value: initial.from, required: true });
  const to = el("input", { type: "date", value: initial.to, required: true });
  const checkboxes = ALL_IUCN_CATEGORIES.map((category) => ({
    category,
    input: el("input", { type: "checkbox", checked: initial.categories.includes(category) }),
  }));
  const where = el(
    "select",
    {},
    el("option", { value: ANYWHERE }, "Anywhere"),
    ...NEARBY_DISTANCES_KM.map((km) => el("option", { value: nearbyValue(km) }, `Within ${km} km of me`)),
    el("optgroup", { label: "Country" }, ...countryOptions()),
  );
  where.value = initial.country ?? ANYWHERE;

  const form = el(
    "form",
    { className: "filters" },
    el("label", { className: "filters__date" }, "From ", from),
    el("label", { className: "filters__date" }, "To ", to),
    el("label", { className: "filters__where" }, "Where ", where),
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const km = NEARBY_DISTANCES_KM.find((distance) => nearbyValue(distance) === where.value);
    let near: Nearby | undefined;
    if (km !== undefined) {
      onStatus("Finding your location…");
      try {
        near = { ...(await currentPosition()), km };
      } catch {
        onStatus("Couldn't find your location. Allow location access in your browser, or pick a country instead.");
        return;
      }
    }
    onSearch({
      from: from.value,
      to: to.value,
      categories: checkboxes.filter(({ input }) => input.checked).map(({ category }) => category),
      speciesKey: initial.speciesKey,
      subspeciesKey: initial.subspeciesKey,
      country: km === undefined && where.value !== ANYWHERE ? where.value : undefined,
      near,
    });
  });

  return form;
}

function nearbyValue(km: number): string {
  return `near-${km}`;
}

function countryOptions(): HTMLOptionElement[] {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return COUNTRY_CODES.map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, name }) => el("option", { value: code }, name));
}

function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      { maximumAge: 10 * 60 * 1000, timeout: 15 * 1000 },
    );
  });
}
