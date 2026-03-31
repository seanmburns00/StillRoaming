import { state } from "./state.js"
import { render } from "./router.js"

document.addEventListener("DOMContentLoaded", () => {
  // Wire up buttons
  document.getElementById("mapBtn")!.addEventListener("click", () => {
    state.currentView = "map"
    render()
  })

  document.getElementById("bookBtn")!.addEventListener("click", () => {
    state.currentView = "book"
    render()
  })

  // Initial render
  render()
})