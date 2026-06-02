import { fetchEndangeredMammals, getFilteredMammals } from "../api/wikidata.js";
import { Species } from "../models/species.js";
import { navigateToDetail } from "../router.js";

let currentPage = 1;
let isLoading = false;
let allSpecies: Species[] = []; // Store everything fetched so far
let includeSubspecies = true;
let selectedStatuses = ["Endangered", "Critically Endangered", "Vulnerable"];
let searchQuery = "";

function renderGrid(gridElement: HTMLElement) {
  const filtered = allSpecies.filter(s => {
    // 1. Handle Rank
    const isSubspecies = s.rank?.toLowerCase().includes("subspecies");
    
    // 2. Handle Search (Empty search should match everything)
    const matchesSearch = searchQuery === "" || 
                          s.label.toLowerCase().includes(searchQuery) || 
                          s.taxonName.toLowerCase().includes(searchQuery);

    // 3. Handle Status (Crucial: ensure strings match exactly)
    // If your API returns "Endangered", this matches the checkbox value "Endangered"
    //const matchesStatus = selectedStatuses.includes(s.iucnStatus || "");

    // 4. Handle Subspecies Toggle
    const matchesSubToggle = includeSubspecies || !isSubspecies;

    return matchesSearch && matchesSubToggle; // && matchesStatus; todo
  });

  // If no results, show a message so you know the grid isn't "broken"
  if (filtered.length === 0 && allSpecies.length > 0) {
    gridElement.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500">No species match your current filters.</div>`;
  } else {
    gridElement.innerHTML = filtered.map(s => createCardHTML(s)).join("");
  }
}

function createCardHTML(s: Species): string {
  const isSubspecies = s.rank && s.rank.toLowerCase().includes("subspecies");
  const dotClass = isSubspecies ? "dot-subspecies" : "dot-species";
  const labelText = isSubspecies ? "Subspecies" : "Species";

  return `
    <div class="species-card group" onclick="window.location.hash = '${encodeURIComponent(s.taxonName)}'">
      <div class="relative overflow-hidden">
        <div class="rank-badge absolute top-2 left-2 transition-opacity duration-200">
          <span class="status-dot ${dotClass}"></span>
          ${labelText}
        </div>
        <img src="${s.images[0] || 'https://via.placeholder.com/400x300'}" 
             class="card-image transition-transform duration-500 group-hover:scale-105" 
             alt="${s.label}" />
      </div>
      <div class="card-content">
        <h3>${s.label}</h3>
        <p>${s.taxonName}</p>
      </div>
    </div>
  `;
}

export async function SpeciesExplorer(container: HTMLElement) {
  // Initial render with Warning Banner, Checkbox, Grid, and Loading Spinner
  container.innerHTML = `
    <div class="p-8 max-w-7xl mx-auto flex flex-col items-center"> <h1 class="text-4xl font-bold mb-2 text-center">Endangered Species Lookup</h1>
      
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-r-md shadow-sm max-w-2xl">
        <p class="text-sm text-yellow-700 text-center">
          <strong>Notice:</strong> This site is currently only configured to pull data from the <em>Panthera</em> genus.
        </p>
      </div>

      <div class="w-full max-w-3xl mb-10 space-y-6">
        <div class="relative">
          <input id="species-search" type="text" placeholder="Search by name or taxon..." 
                 class="w-full px-12 py-3 border-2 border-gray-200 rounded-full focus:border-green-600 outline-none transition-all shadow-sm">
          <span class="absolute left-4 top-3.5 text-gray-400">🔍</span>
        </div>

        <div class="flex flex-wrap justify-center items-center gap-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div class="flex gap-4">
            ${['Critically Endangered', 'Endangered', 'Vulnerable'].map(status => `
              <label class="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" value="${status}" checked class="status-checkbox w-4 h-4 text-green-600 rounded focus:ring-green-500">
                <span class="text-sm font-medium text-gray-700">${status}</span>
              </label>
            `).join('')}
          </div>

          <div class="flex items-center border-l pl-6 border-gray-200">
            <input id="subspecies-toggle" type="checkbox" checked class="w-4 h-4 text-green-600 rounded cursor-pointer">
            <label for="subspecies-toggle" class="ml-2 text-sm font-medium text-gray-700 cursor-pointer">Include Subspecies</label>
          </div>
        </div>
      </div>

      <div id="species-grid" class="species-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"></div>
      
      <div id="scroll-trigger" class="w-full h-20 flex justify-center items-center mt-8">
         <svg id="loading-spinner" class="animate-spin h-8 w-8 text-green-700 hidden" ...></svg>
      </div>
    </div>
  `;

  const grid = document.getElementById('species-grid')!;
  const toggleCheckbox = document.getElementById('subspecies-toggle') as HTMLInputElement;
  const scrollTrigger = document.getElementById('scroll-trigger')!;
  const spinner = document.getElementById('loading-spinner')!;
  const searchInput = document.getElementById('species-search') as HTMLInputElement;
  const statusCheckboxes = document.querySelectorAll('.status-checkbox');

  // Search Logic: Just re-render
  searchInput.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
    renderGrid(grid); 
  });

  // Status Checkboxes: Just re-render
  statusCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      selectedStatuses = Array.from(statusCheckboxes)
        .filter(i => (i as HTMLInputElement).checked)
        .map(i => (i as HTMLInputElement).value);
      renderGrid(grid);
    });
  });

  // Subspecies Toggle: Just re-render
  toggleCheckbox.addEventListener('change', (e) => {
    includeSubspecies = (e.target as HTMLInputElement).checked;
    renderGrid(grid);
  });

  async function loadPage(page: number) {
    if (isLoading) return;
    isLoading = true;
    const spinner = document.getElementById('loading-spinner')!;
    spinner.classList.remove('hidden');

    // Fetch from API
    const newSpecies = await getFilteredMammals(page, true); // We fetch all, then filter in renderGrid
    
    // Store in our master list (avoiding duplicates)
    newSpecies.forEach(s => {
      if (!allSpecies.find(existing => existing.taxonName === s.taxonName)) {
        allSpecies.push(s);
      }
    });

    // Render based on current filters/search
    renderGrid(document.getElementById('species-grid')!);
    
    isLoading = false;
    spinner.classList.add('hidden');
  }

  // --- Checkbox Event Listener ---
  toggleCheckbox.addEventListener('change', async (e) => {
    includeSubspecies = (e.target as HTMLInputElement).checked;
    // Reset the grid and page counter when the filter changes
    grid.innerHTML = "";
    currentPage = 1;
    await loadPage(currentPage);
  });

  // --- Auto-Load / Infinite Scroll Logic ---
  const observer = new IntersectionObserver((entries) => {
    const target = entries[0];
    // If the scroll trigger div enters the viewport and we aren't currently loading
    if (target.isIntersecting && !isLoading) {
      currentPage++;
      loadPage(currentPage);
    }
  }, {
    root: null,
    rootMargin: '0px',
    threshold: 0.1 // Triggers when 10% of the trigger element is visible
  });

  // Start observing the trigger element at the bottom of the page
  observer.observe(scrollTrigger);

  // Initial Load
  await loadPage(currentPage);
}