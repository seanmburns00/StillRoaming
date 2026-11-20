# Still Roaming

An interactive site for exploring recent sightings of endangered mammals and learning about the species still fighting for their place on the planet.

- **Today**: the home page. It features a species of the day (a different photographed species each day, the same for every visitor) with its description and yearly sightings chart.
- **Field Map**: photographed sightings of Critically Endangered, Endangered and Vulnerable mammals, filtered by date range (the last 30 days by default), status, and place (anywhere, a country, or within 100 or 500 km of the visitor), and clustered on a 2D map. Clicking a sighting opens a panel with the photo, the species and subspecies, where and when it was seen, and who recorded it. The filters and the selected sighting are kept in the URL, so any view can be shared; the visitor's location never is. When the map is showing one species or subspecies, a layer of GBIF's all-time records sits under the recent sightings, for comparing where it has been recorded with where it is being seen now. Sticky notes link to three conservation organizations, picked at random on each visit.
- **Field Guide**: a book-style catalog of the same species that appear on the map. The table of contents has one chapter per mammal order, and a search box that matches species and subspecies names. Each species gets a two-page spread with a photo, a range map, a Wikipedia summary, its sighting count, a chart of photographed sightings per year over the last 20 years, a link to the conservation organizations page, and links to its subspecies and to its sightings on the map.
- **Subspecies pages**: the same layout for each sighted subspecies (Bengal tiger, Cross River gorilla, …). They show the species' status, plus the subspecies' own IUCN assessment when Wikidata has one, which is often more severe (the Sumatran tiger is Critically Endangered; the tiger as a species is Endangered).
- **Quiz**: a daily puzzle, the same for everyone. Five photos from the last 30 days: pick the animal from four names (500 points), then drop a pin where it was photographed (up to 500 points, fewer the further away). The top score is always 5,000. A sighting is never used again within 90 days. The answers are encrypted in the published files, so they can't be read straight out of `daily-quiz.json`; this keeps honest players honest, but the key is in the site's code, so it isn't real secrecy. Progress and the final score are saved in the browser, so a refresh doesn't restart the game; clearing site data does. A new quiz starts for everyone at midnight Eastern Time, and the results screen counts down to it.
- **Conservation organizations**: every organization the site links to, with what each one focuses on. The list is kept by hand in `CONSERVATION_ORGS` (`src/config.ts`).
- **Share pages**: `species/<GBIF key>/` and `subspecies/<GBIF key>/` are static pages with Open Graph tags, so a shared link previews with the animal's name, status and photo, then forwards to the page in the app. The **Copy share link** button on each page copies one.

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
| Once a day | `npm run data` also schedules the daily quizzes (`public/daily-quiz.json`), for today and the next two days (Eastern Time), so the next quiz is already live at midnight even when GitHub starts the nightly run hours late. Quizzes already on the live site are kept as they are, so a rebuild never changes one people may have played. It reads `quiz-history.json` from the live site to skip sightings used within 90 days, and keeps only those 90 days | 1 to GBIF, 2 to the live site |
| Once per visit | The browser downloads `species-index.json` (about 150 KB), shared by every view | 1 |
| Every map search | The sightings for the chosen dates, statuses, place and species or subspecies | 1–5 to GBIF |
| Opening the quiz | The day's puzzle | 1, to this site |
| Opening a species or subspecies page, or the home page | Description, large photo, range map and assessment; sightings per year | 1 to Wikidata, 1 to Wikipedia, 1 to GBIF |
| Showing one species on the map | All-time occurrence density tiles | GBIF map tiles, as the map pans and zooms |

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
npm run build      # type-check, build to dist/, and write the share pages (needs public/species-index.json)
npm run test:e2e   # browser tests (Playwright) against the built site, light and dark, with every API mocked
npm run preview    # serve the built site at http://localhost:4173/StillRoaming/
```

Before the first `npm run test:e2e`, install the browser with `npx playwright install chromium`. The browser tests also run an axe accessibility check on the home, species, organizations and quiz pages.

`public/species-index.json` is generated, not committed. If `npm run data` fails with a certificate error on a network that inspects TLS traffic, run it with Node using the system certificate store: `NODE_OPTIONS=--use-system-ca npm run data` (PowerShell: `$env:NODE_OPTIONS="--use-system-ca"; npm run data`).

## Project layout

```
src/
  api/          GBIF, Wikidata and Wikipedia clients, and the species list loader
  data/         Build-time species list: GBIF statuses, subspecies and counts, merged with Wikidata
  models/       Shared types (Sighting, Species, IUCN categories)
  ui/           DOM helper, app shell, shared components, yearly sightings chart
  views/home/   Today: species of the day
  views/map/    Field Map: filters, sighting panel, sticky notes
  views/book/   Field Guide: contents, chapters, species and subspecies pages
  views/quiz/   Quiz
  views/organizations/  Conservation organizations
  config.ts     Mammal orders, domestic animals to exclude, conservation organizations, countries, limits
  router.ts     Hash routes: #/ (home), #/map (?species=, subspecies=, from=, to=, status=, country=, sighting=),
                #/book, #/book/<order>, #/species/<GBIF key>, #/subspecies/<GBIF key>, #/quiz, #/organizations
scripts/        build-species-index.ts and build-daily-quiz.ts, run by `npm run data`; build-share-pages.ts, run by `npm run build`
e2e/            Playwright tests and their mocked API responses
```

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`, once a day, and on demand from the repository's **Actions** tab (**Run workflow**). It runs the unit tests, rebuilds the species list, builds, runs the browser tests, and publishes `dist/` to GitHub Pages. If GBIF or Wikidata is down, the run fails and the previous deployment stays live. In the repository settings, set **Pages → Source** to **GitHub Actions**.

Other branches are not deployed.
