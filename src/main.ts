import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "./styles/main.css";
import { parseRoute, type Route } from "./router";
import { renderShell } from "./ui/shell";
import { mountChapterView } from "./views/book/chapterView";
import { mountContentsView } from "./views/book/contentsView";
import { mountSpeciesPage } from "./views/book/speciesPage";
import { mountSubspeciesPage } from "./views/book/subspeciesPage";
import { mountMapView } from "./views/map/mapView";

const shell = renderShell(document.querySelector<HTMLElement>("#app")!);
let unmountCurrentView = () => {};

function mount(route: Route): () => void {
  switch (route.view) {
    case "map":
      return mountMapView(shell.outlet, { speciesKey: route.speciesKey, subspeciesKey: route.subspeciesKey });
    case "contents":
      return mountContentsView(shell.outlet);
    case "chapter":
      return mountChapterView(shell.outlet, route.order);
    case "species":
      return mountSpeciesPage(shell.outlet, route.speciesKey);
    case "subspecies":
      return mountSubspeciesPage(shell.outlet, route.subspeciesKey);
  }
}

function render() {
  unmountCurrentView();
  shell.outlet.replaceChildren();
  const route = parseRoute(window.location.hash);
  shell.setActive(route);
  unmountCurrentView = mount(route);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", render);
render();
