import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const index = { generatedAt: "2026-10-02T06:00:00.000Z", species: [{ gbifKey: 5219416, commonName: "Tiger" }] };

describe("fetchSpeciesIndex", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the published species list from the site", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(index)));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchSpeciesIndex } = await import("./speciesIndex");

    await expect(fetchSpeciesIndex()).resolves.toEqual(index.species);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${import.meta.env.BASE_URL}species-index.json`);
  });

  it("is shared by every view instead of being fetched again", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify(index)));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchSpeciesIndex } = await import("./speciesIndex");

    await Promise.all([fetchSpeciesIndex(), fetchSpeciesIndex()]);
    await fetchSpeciesIndex();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries after a failure instead of keeping it", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("missing", { status: 404 }))
        .mockResolvedValueOnce(new Response(JSON.stringify(index))),
    );
    const { fetchSpeciesIndex } = await import("./speciesIndex");

    await expect(fetchSpeciesIndex()).rejects.toThrow("status 404");
    await expect(fetchSpeciesIndex()).resolves.toEqual(index.species);
  });
});
