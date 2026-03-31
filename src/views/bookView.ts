// TODO THIS IS FOR TESTING WITH AN IFRAME APPROACH
import { fetchEndangeredMammalTaxonNames, fetchSpeciesData } from "../api/wikidata.js"
import type { Species } from "../models/species.js"

export async function renderBookView(container: HTMLElement) {
  container.innerHTML = "<p>Loading endangered mammals...</p>"

  try {
    const speciesList = await fetchEndangeredMammalTaxonNames()

    if (!speciesList.length) {
      container.innerHTML = "<p>No endangered mammals found.</p>"
      return
    }

    renderSpeciesList(container, speciesList)

  } catch (err) {
    console.error(err)
    container.innerHTML = "<p>Error loading species list.</p>"
  }
}

function renderSpeciesList(container: HTMLElement, speciesList: string[]) {
  container.innerHTML = `
    <div class="species-list">
      <h2>Endangered Mammals</h2>
      <ul id="species-ul"></ul>
    </div>
  `

  const ul = document.getElementById("species-ul") as HTMLUListElement

  speciesList.forEach(name => {
    const li = document.createElement("li")
    const btn = document.createElement("button")

    btn.textContent = name
    btn.className = "species-button"

    btn.onclick = async () => {
      container.innerHTML = "<p>Loading species data...</p>"

      const species = await fetchSpeciesData(name)

      if (!species) {
        container.innerHTML = "<p>No data found.</p>"
        return
      }

      renderTablet(container, species)
    }

    li.appendChild(btn)
    ul.appendChild(li)
  })
}

export function renderTablet(container: HTMLElement, species: Species) {
  container.innerHTML = `
    <button id="back-btn">← Back to List</button>

    <div class="tablet" id="tablet">
      <div class="tablet-nav" id="tablet-nav">➡️</div>
      <div class="tablet-info">
        <h2>${species.label}</h2>
        <p><strong>Scientific Name:</strong> ${species.taxonName}</p>
        <p><strong>IUCN Status:</strong> ${species.iucnStatus ?? "Unknown"}</p>
        ${
          species.population
            ? `<p><strong>Population:</strong> ${species.population.toLocaleString()}${
                species.populationPointInTime ? ` as of ${species.populationPointInTime.slice(0, 10)}` : ""
              }</p>`
            : ""
        }
        <p>${species.description ?? ""}</p>
      </div>
      <div class="tablet-wiki">
        <iframe src="${species.wikipedia}" loading="lazy"></iframe>
      </div>
    </div>
  `

  const tablet = document.getElementById("tablet")!
  const nav = document.getElementById("tablet-nav")!

  nav.addEventListener("click", () => {
    tablet.classList.toggle("horizontal")
  })

  const backBtn = document.getElementById("back-btn")!
  backBtn.addEventListener("click", () => {
    renderBookView(container)
  })
}

function renderSpecies(container: HTMLElement, species: Species) {
  container.innerHTML = `
    <h2>${species.label}</h2>
    <p><strong>Scientific Name:</strong> ${species.taxonName}</p>
    <p><strong>IUCN Status:</strong> ${species.iucnStatus ?? "Unknown"}</p>
    ${
      species.population
        ? `<p><strong>Population:</strong> ${species.population.toLocaleString()}${
            species.populationPointInTime
              ? ` as of ${species.populationPointInTime.slice(0, 10)}`
              : ""
          }</p>`
        : ""
    }
    <p>${species.description ?? ""}</p>
    ${
      species.commonNames.length > 0
        ? `<p><strong>Other common names:</strong> ${species.commonNames.join(", ")}</p>`
        : ""
    }
  `

  // Main Image
  if (species.images.length > 0) {
    const img = document.createElement("img")
    img.src = species.images[0]
    img.style.maxWidth = "400px"
    container.appendChild(img)
  }

  // Range Map
  if (species.rangeMaps.length > 0) {
    const range = document.createElement("img")
    range.src = species.rangeMaps[0]
    range.style.maxWidth = "400px"
    container.appendChild(range)
  }

  // Wikipedia iframe
  if (species.wikipedia) {
    const wikiFrame = document.createElement("iframe")
    wikiFrame.src = species.wikipedia
    wikiFrame.style.width = "100%"
    wikiFrame.style.height = "600px"
    wikiFrame.style.border = "1px solid #ccc"
    wikiFrame.loading = "lazy"
    container.appendChild(document.createElement("hr"))
    container.appendChild(wikiFrame)
  }
}