# Still Roaming

An interactive site for exploring recent sightings of endangered mammals and learning about the species still fighting for their place on the planet.

- **Field Map**: photographed sightings of Critically Endangered, Endangered and Vulnerable mammals, filtered by date range (the last 30 days by default) and status, and clustered on a 2D map. Clicking a sighting opens a panel with the photo, the species and subspecies, where and when it was seen, and who recorded it. Sticky notes on the map link to conservation organizations' donation pages.
- **Field Guide**: a book-style catalog of the same species that appear on the map. The table of contents has one chapter per mammal order, and a search box that matches species and subspecies names. Each species gets a two-page spread with a photo, a range map, a Wikipedia summary, its sighting count, and links to its subspecies and to its sightings on the map.
- **Subspecies pages**: the same layout for each sighted subspecies (Bengal tiger, Cross River gorilla, …). They show the species' status, plus the subspecies' own IUCN assessment when Wikidata has one, which is often more severe (the Sumatran tiger is Critically Endangered; the tiger as a species is Endangered).

The site follows the system's light or dark setting until the visitor picks one with the theme button, which it then remembers.

## Data sources

| Source | Used for |
| --- | --- |
| [GBIF occurrence API](https://techdocs.gbif.org/en/openapi/v1/occurrence) | Sightings, which species are tracked, their IUCN Red List category, subspecies, and sighting counts |
| [Wikidata SPARQL](https://query.wikidata.org/) | Common names, photos, range maps, descriptions and subspecies assessments, matched to GBIF by GBIF ID (P846) |
| [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) | Summaries on species and subspecies pages |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Map tiles |

GBIF is the single source of which species are tracked and what their status is, so the map and the guide always agree. Wikidata only adds detail; species it does not know fall back to GBIF names. The one exception is the separate subspecies assessment, which is labelled as coming from Wikidata.

### What is built daily and what is live

Building the species list takes about 40 requests, more than GBIF allows a single visitor in a burst, so it is built ahead of time instead of in the browser.

| When | What | Requests |
| --- | --- | --- |
| Once a day, and on every push to `main` | `npm run data` builds `public/species-index.json`: statuses, subspecies, sighting counts, names and thumbnails for every tracked species | About 40, 4 at a time, in 10–15 seconds |
| Once per visit | The browser downloads `species-index.json` (about 150 KB), shared by every view | 1 |
| Every map search | The sightings for the chosen dates, statuses and species or subspecies | 1–5 to GBIF |
| Opening a species or subspecies page | Description, large photo, range map and assessment | 1 to Wikidata, 1 to Wikipedia |

Guide counts and the species list can be up to a day old; map sightings are always current. Building the list:

- takes each species' status from its rated GBIF records,
- adds the species' subspecies, because GBIF only rates records identified to species level, and most sightings of animals like lions and tigers are recorded as a subspecies,
- leaves out the domestic animals in `DOMESTICATED_SPECIES_KEYS` (`src/config.ts`), which GBIF files under the same names as threatened wild relatives.

The map is limited to recognisable land-mammal orders (`MAMMAL_ORDERS` in `src/config.ts`). It loads up to `MAX_SIGHTINGS` (1,500) records per search and says so when there are more.

## Development

Requires Node 22.12 or newer (Vitest 5 does not support Node 20).

```sh
npm install
npm run data       # build public/species-index.json (needed before dev; rerun to refresh)
npm run dev        # local dev server
npm test           # unit tests (Vitest)
npm run build      # type-check and build to dist/
npm run preview    # serve the built site at http://localhost:4173/StillRoaming/
```

`public/species-index.json` is generated, not committed. If `npm run data` fails with a certificate error on a network that inspects TLS traffic, run it with Node using the system certificate store: `NODE_OPTIONS=--use-system-ca npm run data` (PowerShell: `$env:NODE_OPTIONS="--use-system-ca"; npm run data`).

## Project layout

```
src/
  api/          GBIF, Wikidata and Wikipedia clients, and the species list loader
  data/         Build-time species list: GBIF statuses, subspecies and counts, merged with Wikidata
  models/       Shared types (Sighting, Species, IUCN categories)
  ui/           DOM helper, app shell, shared components
  views/map/    Field Map: filters, sighting panel, sticky notes
  views/book/   Field Guide: contents, chapters, species and subspecies pages
  config.ts     Mammal orders, domestic animals to exclude, conservation organizations, limits
  router.ts     Hash routes: #/map (?species= or ?subspecies=<GBIF key>), #/book, #/book/<order>,
                #/species/<GBIF key>, #/subspecies/<GBIF key>
scripts/        build-species-index.ts, run by `npm run data`
```

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`, once a day, and on demand from the repository's **Actions** tab (**Run workflow**). It tests, rebuilds the species list, builds, and publishes `dist/` to GitHub Pages. If GBIF or Wikidata is down, the run fails and the previous deployment stays live. In the repository settings, set **Pages → Source** to **GitHub Actions**.

Other branches are not deployed.
