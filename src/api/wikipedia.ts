import { getJson } from "./http";

interface PageSummary {
  extract?: string;
}

export function articleTitle(articleUrl: string): string | undefined {
  const { hostname, pathname } = new URL(articleUrl);
  if (hostname !== "en.wikipedia.org" || !pathname.startsWith("/wiki/")) return undefined;
  return decodeURIComponent(pathname.slice("/wiki/".length));
}

export async function fetchWikipediaExtract(articleUrl: string, signal?: AbortSignal): Promise<string | undefined> {
  const title = articleTitle(articleUrl);
  if (!title) return undefined;
  const summary = await getJson<PageSummary>(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { signal },
  );
  return summary.extract;
}
