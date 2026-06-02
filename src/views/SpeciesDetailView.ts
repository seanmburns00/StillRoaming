import { fetchSpeciesData } from "../api/wikidata.js";

export async function SpeciesDetailView(container: HTMLElement, taxonName: string) {
  const species = await fetchSpeciesData(taxonName);

  if (!species) {
    container.innerHTML = `<div class="p-10 text-red-500">Species not found.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="max-w-4xl mx-auto p-8">
      <button onclick="window.location.hash = ''" class="mb-4 text-blue-600">← Back to List</button>
      
      <div class="grid md:grid-cols-2 gap-8">
        <img src="${species.images[0]}" class="rounded-xl shadow-lg w-full" />
        
        <div>
          <h1 class="text-4xl font-bold">${species.label}</h1>
          <p class="text-xl italic text-green-800 mb-4">${species.taxonName}</p>
          
          <div class="bg-gray-100 p-4 rounded-lg mb-4">
            <p><strong>Conservation Status:</strong> ${species.iucnStatus || 'N/A'}</p>
            <p><strong>Population:</strong> ${species.population?.toLocaleString() ?? 'Unknown'}</p>
          </div>

          <p class="text-gray-700 leading-relaxed">${species.description || 'No description available.'}</p>
          
          ${species.wikipedia ? `
            <a href="${species.wikipedia}" target="_blank" class="mt-6 inline-block bg-blue-600 text-white px-4 py-2 rounded">
              Read more on Wikipedia
            </a>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}