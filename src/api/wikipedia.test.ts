import { afterEach, describe, expect, it, vi } from "vitest";
import { articleTitle, fetchWikipediaExtract } from "./wikipedia";

describe("articleTitle", () => {
  it("decodes the article title from an English Wikipedia URL", () => {
    expect(articleTitle("https://en.wikipedia.org/wiki/Bornean_orangutan")).toBe("Bornean_orangutan");
    expect(articleTitle("https://en.wikipedia.org/wiki/P%C3%A8re_David%27s_deer")).toBe("Père_David's_deer");
  });

  it("ignores URLs that are not English Wikipedia articles", () => {
    expect(articleTitle("https://de.wikipedia.org/wiki/Tiger")).toBeUndefined();
    expect(articleTitle("https://en.wikipedia.org/w/index.php?title=Tiger")).toBeUndefined();
  });
});

describe("fetchWikipediaExtract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests the summary for the article and returns its extract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ extract: "A deer native to China." })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWikipediaExtract("https://en.wikipedia.org/wiki/P%C3%A8re_David%27s_deer")).resolves.toBe(
      "A deer native to China.",
    );
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://en.wikipedia.org/api/rest_v1/page/summary/P%C3%A8re_David's_deer");
  });

  it("skips the request for non-English Wikipedia links", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWikipediaExtract("https://de.wikipedia.org/wiki/Tiger")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
