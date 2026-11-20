import L from "leaflet";
import "leaflet.markercluster";
import { fetchSightings, type SightingQuery, type TaxonFilter } from "../../api/gbif";
import { fetchSpeciesIndex, findSubspecies } from "../../api/speciesIndex";
import type { Sighting } from "../../models/sighting";
import type { SpeciesSummary } from "../../models/species";
import { el } from "../../ui/dom";
import { filterPanel } from "./filterPanel";
import { defaultQuery, describeResults, validateQuery } from "./query";
import { sightingCard } from "./sightingCard";
import { stickyNotes } from "./stickyNotes";

const WEB_MERCATOR_MAX_LATITUDE = 85.0511;
const MARKER_RADIUS = 7;
const SELECTED_MARKER_RADIUS = 11;

export function mountMapView(outlet: HTMLElement, filter: TaxonFilter): () => void {
  const initialQuery = defaultQuery(new Date(), filter);
  const speciesName = el("em", {}, filter.subspeciesKey === undefined ? "this species" : "this subspecies");
  let speciesByKey = new Map<number, SpeciesSummary>();
  const status = el("p", { className: "map-status", role: "status" });
  const mapElement = el("div", { className: "map" });
  const sightingPanel = el("aside", { className: "sighting-panel", ariaLabel: "Selected sighting", hidden: true });

  outlet.append(
    el(
      "section",
      { className: "map-view" },
      filterPanel(initialQuery, search, speciesName),
      status,
      el("div", { className: "map-frame" }, mapElement, sightingPanel, stickyNotes()),
    ),
  );

  const map = L.map(mapElement, {
    worldCopyJump: true,
    minZoom: 2,
    maxBounds: L.latLngBounds([-WEB_MERCATOR_MAX_LATITUDE, -Infinity], [WEB_MERCATOR_MAX_LATITUDE, Infinity]),
    maxBoundsViscosity: 1,
  }).setView([15, 20], 2);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    className: "base-tiles",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  const markers = L.markerClusterGroup({ chunkedLoading: true, showCoverageOnHover: false }).addTo(map);

  let controller: AbortController | undefined;

  let selectedMarker: L.CircleMarker | undefined;

  function selectSighting(sighting: Sighting, marker: L.CircleMarker) {
    selectedMarker?.setRadius(MARKER_RADIUS);
    selectedMarker = marker.setRadius(SELECTED_MARKER_RADIUS).bringToFront();
    sightingPanel.replaceChildren(
      el("button", { type: "button", className: "sighting-panel__close", ariaLabel: "Close", onclick: clearSelection }, "×"),
      sightingCard(sighting, speciesByKey.get(sighting.speciesKey)),
    );
    sightingPanel.hidden = false;
  }

  function clearSelection() {
    selectedMarker?.setRadius(MARKER_RADIUS);
    selectedMarker = undefined;
    sightingPanel.hidden = true;
    sightingPanel.replaceChildren();
  }

  map.on("click", clearSelection);

  function toMarker(sighting: Sighting): L.CircleMarker {
    const marker = L.circleMarker([sighting.lat, sighting.lng], {
      radius: MARKER_RADIUS,
      className: `sighting-marker sighting-marker--${sighting.category}`,
    });
    return marker.on("click", (event) => {
      L.DomEvent.stopPropagation(event);
      selectSighting(sighting, marker);
    });
  }

  async function search(query: SightingQuery) {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    clearSelection();
    markers.clearLayers();

    const problem = validateQuery(query);
    if (problem) {
      status.textContent = problem;
      return;
    }

    status.textContent = "Searching the field records…";
    try {
      const index = await fetchSpeciesIndex();
      speciesByKey = new Map(index.map((species) => [species.gbifKey, species]));
      const focusName = focusedTaxonName(index, filter);
      if (focusName) speciesName.textContent = focusName;

      const { sightings, total } = await fetchSightings(query, speciesByKey, signal);
      markers.addLayers(sightings.map(toMarker));
      status.textContent = describeResults(sightings.length, total);
    } catch (error) {
      if (signal.aborted) return;
      console.error(error);
      status.textContent = "Couldn't load sightings just now. Please try again in a moment.";
    }
  }

  void search(initialQuery);

  return () => {
    controller?.abort();
    map.remove();
  };
}

function focusedTaxonName(index: SpeciesSummary[], filter: TaxonFilter): string | undefined {
  if (filter.subspeciesKey !== undefined) {
    const subspecies = findSubspecies(index, filter.subspeciesKey)?.subspecies;
    return subspecies && (subspecies.commonName ?? subspecies.taxonName);
  }
  return index.find((species) => species.gbifKey === filter.speciesKey)?.commonName;
}
