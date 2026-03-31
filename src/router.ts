import { state } from "./state.js"
import { renderMapView } from "./views/mapView.js"
import { renderBookView } from "./views/bookView.js"

export function render() {
  const app = document.getElementById("app")!
  app.innerHTML = "" // clear previous view

  if (state.currentView === "map") {
    renderMapView(app)
  } else if (state.currentView === "book") {
    renderBookView(app)
  }
}