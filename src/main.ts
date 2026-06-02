import { SpeciesExplorer } from './views/SpeciesExplorer.js';
import { SpeciesDetailView } from './views/SpeciesDetailView.js';

/**
 * The Router Function
 * Dispatches the correct view based on the URL Hash
 */
async function router() {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) return;

  // Clear previous view and show a loading state
  root.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;

  // Get the taxon name from the URL hash (e.g., #Panthera%20leo -> Panthera leo)
  const rawHash = window.location.hash.slice(1);
  const taxonName = decodeURIComponent(rawHash);

  try {
    if (taxonName) {
      // Route: Detail View
      await SpeciesDetailView(root, taxonName);
    } else {
      // Route: Gallery/Home View
      await SpeciesExplorer(root);
    }
  } catch (error) {
    root.innerHTML = `
      <div class="error-state">
        <h2>Oops! Something went wrong.</h2>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <button onclick="window.location.hash = ''">Return Home</button>
      </div>
    `;
  }
}

// Global Event Listeners
window.addEventListener('hashchange', router);
window.addEventListener('load', router);