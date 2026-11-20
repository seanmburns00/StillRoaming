import { IUCN_CATEGORIES } from "../models/iucn";
import type { SpeciesSummary } from "../models/species";
import { routes } from "../router";
import { sightingsLabel } from "../ui/labels";

const PREVIEW_IMAGE_WIDTH = "1200";

export interface SharePage {
  path: string;
  html: string;
}

interface Preview {
  path: string;
  appRoute: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export function sharePages(index: SpeciesSummary[], siteUrl: string): SharePage[] {
  return index.flatMap((species) => {
    const status = IUCN_CATEGORIES[species.category].label;
    const speciesPage: Preview = {
      path: routes.sharePage("species", species.gbifKey),
      appRoute: routes.species(species.gbifKey),
      title: species.commonName,
      description: `${status}. ${sightingsLabel(species.sightings)} photographed in the wild and shared on GBIF.`,
      imageUrl: species.imageUrl,
    };
    const subspeciesPages = species.subspecies.map((subspecies): Preview => ({
      path: routes.sharePage("subspecies", subspecies.gbifKey),
      appRoute: routes.subspecies(subspecies.gbifKey),
      title: subspecies.commonName ?? subspecies.taxonName,
      description: `A subspecies of the ${species.commonName} (${status}). ${sightingsLabel(subspecies.sightings)} photographed in the wild and shared on GBIF.`,
      imageUrl: species.imageUrl,
    }));
    return [speciesPage, ...subspeciesPages].map((preview) => ({ path: preview.path, html: previewHtml(preview, siteUrl) }));
  });
}

export function previewHtml(preview: Preview, siteUrl: string): string {
  const appUrl = `../../${preview.appRoute}`;
  const title = escapeHtml(`${preview.title} · Still Roaming`);
  const description = escapeHtml(preview.description);
  const image = preview.imageUrl && escapeHtml(largerImage(preview.imageUrl));
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Still Roaming" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${escapeHtml(new URL(preview.path, siteUrl).href)}" />
${image ? `    <meta property="og:image" content="${image}" />\n    <meta name="twitter:card" content="summary_large_image" />\n` : ""}    <meta http-equiv="refresh" content="0; url=${escapeHtml(appUrl)}" />
  </head>
  <body>
    <p><a href="${escapeHtml(appUrl)}">Open ${escapeHtml(preview.title)} in Still Roaming</a></p>
  </body>
</html>
`;
}

function largerImage(imageUrl: string): string {
  const url = new URL(imageUrl);
  if (url.searchParams.has("width")) url.searchParams.set("width", PREVIEW_IMAGE_WIDTH);
  return url.href;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
