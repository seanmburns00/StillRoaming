import { SpeciesExplorer } from "./views/SpeciesExplorer.js";
import { SpeciesDetailView } from "./views/SpeciesDetailView.js";

export const routes = {
  home: "/",
  detail: "/species/:taxonName",
};

/**
 * Simple helper to navigate and pass the taxonName 
 * as a URL parameter to keep the state shareable.
 */
export const navigateToDetail = (taxonName: string) => {
  window.location.hash = `#${taxonName}`;
};