export function renderMapView(container: HTMLElement) {
  const el = document.createElement("div")

  // TODO
  el.innerHTML = `
    <h2>Map View</h2>
    <p>The map will go here.</p>
  `
  container.appendChild(el)
}