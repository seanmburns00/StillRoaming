import { fetchEndangeredMammalTaxonNames, fetchSpeciesData } from "../api/wikidata.js"
import type { Species } from "../models/species.js"

export async function renderBookView(container: HTMLElement) {
  container.innerHTML = "<p>Loading endangered mammals...</p>"

  try {
    const taxonNames = await fetchEndangeredMammalTaxonNames()

    if (!taxonNames.length) {
      container.innerHTML = "<p>No endangered mammals found.</p>"
      return
    }

    renderSpeciesList(container, taxonNames)

  } catch (err) {
    console.error(err)
    container.innerHTML = "<p>Error loading species list.</p>"
  }
}

function renderSpeciesList(container: HTMLElement, taxonNames: string[]) {
  container.innerHTML = `
    <h2>Endangered Mammals</h2>
    <ul id="species-list"></ul>
  `

  const list = container.querySelector("#species-list") as HTMLUListElement

  taxonNames.forEach(name => {
    const li = document.createElement("li")
    const button = document.createElement("button")

    button.textContent = name
    button.style.cursor = "pointer"

    button.onclick = async () => {
      container.innerHTML = "<p>Loading species data...</p>"

      const species = await fetchSpeciesData(name)

      if (!species) {
        container.innerHTML = "<p>No data found.</p>"
        return
      }

      renderSpecies(container, species)
    }

    li.appendChild(button)
    list.appendChild(li)
  })
}

// export async function renderBookView(container: HTMLElement) {
//   container.innerHTML = "<p>Loading tiger data...</p>"

//   try {
//     // TODO: TESTING STATIC PAGE
//     const tiger = await fetchSpeciesData("Panthera tigris")

//     if (!tiger) {
//       container.innerHTML = "<p>No data found.</p>"
//       return
//     }

//     renderSpecies(container, tiger)

//   } catch (err) {
//     console.error(err)
//     container.innerHTML = "<p>Error loading data.</p>"
//   }
// }

function renderSpecies(container: HTMLElement, species: Species) {
  const backButton = document.createElement("button")
  backButton.textContent = "← Back to List"
  backButton.onclick = () => renderBookView(container)
  container.appendChild(backButton)

  container.innerHTML = `
    <h2>${species.label}</h2>
    <p><strong>Scientific Name:</strong> ${species.taxonName}</p>
    <p><strong>IUCN Status:</strong> ${species.iucnStatus ?? "Unknown"}</p>
    ${species.population ? `<p><strong>Population:</strong> ${species.population.toLocaleString()}${species.populationPointInTime ? ` as of ${species.populationPointInTime.slice(0, 10)}` : ""}</p>` : ""}
    <p>${species.description ?? ""}</p>
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

  // Wikipedia link
  if (species.wikipedia) {
    const link = document.createElement("a")
    link.href = species.wikipedia
    link.target = "_blank"
    link.textContent = "Read more on Wikipedia"
    container.appendChild(link)
  }

  // Video
  if (species.videos.length > 0) {
    const video = document.createElement("video")
    video.src = species.videos[0]
    video.controls = true
    video.style.maxWidth = "400px"
    container.appendChild(video)
  }

  // Audio
  if (species.audios.length > 0) {
    const audio = document.createElement("audio")
    audio.src = species.audios[0]
    audio.controls = true
    container.appendChild(audio)
  }
}