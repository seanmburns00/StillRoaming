import L from "leaflet";
import "leaflet.markercluster";
import { densityTilesUrl, fetchSightings, type SightingQuery } from "../../api/gbif";
import { fetchSpeciesIndex, findSubspecies } from "../../api/speciesIndex";
import type { Sighting } from "../../models/sighting";
import type { SpeciesSummary } from "../../models/species";
import { routes, type MapState } from "../../router";
import { el } from "../../ui/dom";
import { filterPanel } from "./filterPanel";
import { defaultQuery, describeResults, toMapState, validateQuery } from "./query";
import { sightingCard } from "./sightingCard";
import { stickyNotes } from "./stickyNotes";

const WEB_MERCATOR_MAX_LATITUDE = 85.0511;
const MARKER_RADIUS = 7;
const SELECTED_MARKER_RADIUS = 11;

interface PlottedSighting {
  sighting: Sighting;
  marker: L.CircleMarker;
}

export function mountMapView(outlet: HTMLElement, state: MapState): () => void {
  let query = defaultQuery(new Date(), state);
  let sightingToOpen = state.sightingId;
  const speciesName = el("em", {}, state.subspeciesKey === undefined ? "this species" : "this subspecies");
  let speciesByKey = new Map<number, SpeciesSummary>();
  let plotted: PlottedSighting[] = [];
  const status = el("p", { className: "map-status", role: "status" });
  const mapElement = el("div", { className: "map" });
  const sightingPanel = el("aside", { className: "sighting-panel", ariaLabel: "Selected sighting", hidden: true });

  outlet.append(
    el(
      "section",
      { className: "map-view" },
      filterPanel(query, submit, speciesName),
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

  const focusKey = state.subspeciesKey ?? state.speciesKey;
  if (focusKey !== undefined) {
    const allTimeRecords = L.tileLayer(densityTilesUrl(focusKey), {
      opacity: 0.6,
      attribution: 'Occurrence density &copy; <a href="https://www.gbif.org">GBIF</a>',
    }).addTo(map);
    L.control.layers(undefined, { "All GBIF records, all time": allTimeRecords }, { collapsed: false, position: "bottomright" }).addTo(map);
  }

  const markers = L.markerClusterGroup({ chunkedLoading: true, showCoverageOnHover: false }).addTo(map);
  let controller: AbortController | undefined;
  let selected: PlottedSighting | undefined;

  function saveUrl() {
    history.replaceState(null, "", routes.map(toMapState(query, selected?.sighting.id)));
  }

  function selectSighting(entry: PlottedSighting) {
    selected?.marker.setRadius(MARKER_RADIUS);
    selected = entry;
    entry.marker.setRadius(SELECTED_MARKER_RADIUS).bringToFront();
    sightingPanel.replaceChildren(
      el("button", { type: "button", className: "sighting-panel__close", ariaLabel: "Close", onclick: () => clearSelection(true) }, "×"),
      sightingCard(entry.sighting, speciesByKey.get(entry.sighting.speciesKey)),
    );
    sightingPanel.hidden = false;
    saveUrl();
  }

  function clearSelection(updateUrl: boolean) {
    if (!selected) return;
    selected.marker.setRadius(MARKER_RADIUS);
    selected = undefined;
    sightingPanel.hidden = true;
    sightingPanel.replaceChildren();
    if (updateUrl) saveUrl();
  }

  map.on("click", () => clearSelection(true));

  function plot(sighting: Sighting): PlottedSighting {
    const marker = L.circleMarker([sighting.lat, sighting.lng], {
      radius: MARKER_RADIUS,
      className: `sighting-marker sighting-marker--${sighting.category}`,
    });
    const entry = { sighting, marker };
    marker.on("click", (event) => {
      L.DomEvent.stopPropagation(event);
      selectSighting(entry);
    });
    return entry;
  }

  function submit(next: SightingQuery) {
    query = next;
    clearSelection(false);
    saveUrl();
    void search();
  }

  async function search() {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    clearSelection(false);
    markers.clearLayers();
    plotted = [];

    const problem = validateQuery(query);
    if (problem) {
      status.textContent = problem;
      return;
    }

    status.textContent = "Searching the field records…";
    try {
      const index = await fetchSpeciesIndex();
      speciesByKey = new Map(index.map((species) => [species.gbifKey, species]));
      const focusName = focusedTaxonName(index, state);
      if (focusName) speciesName.textContent = focusName;

      const { sightings, total } = await fetchSightings(query, speciesByKey, signal);
      plotted = sightings.map(plot);
      markers.addLayers(plotted.map((entry) => entry.marker));
      status.textContent = describeResults(sightings.length, total);
      openSharedSighting();
    } catch (error) {
      if (signal.aborted) return;
      console.error(error);
      status.textContent = "Couldn't load sightings just now. Please try again in a moment.";
    }
  }

  function openSharedSighting() {
    const entry = plotted.find(({ sighting }) => sighting.id === sightingToOpen);
    sightingToOpen = undefined;
    if (!entry) return;
    markers.zoomToShowLayer(entry.marker, () => selectSighting(entry));
  }

  void search();

  return () => {
    controller?.abort();
    map.remove();
  };
}

function focusedTaxonName(index: SpeciesSummary[], state: MapState): string | undefined {
  if (state.subspeciesKey !== undefined) {
    const subspecies = findSubspecies(index, state.subspeciesKey)?.subspecies;
    return subspecies && (subspecies.commonName ?? subspecies.taxonName);
  }
  return index.find((entry) => entry.gbifKey === state.speciesKey)?.commonName;
}
