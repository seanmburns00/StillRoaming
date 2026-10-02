import { afterEach, describe, expect, it, vi } from "vitest";
import { getJson, secureUrl } from "./http";

describe("secureUrl", () => {
  it("upgrades http to https so images load on the https-hosted site", () => {
    expect(secureUrl("http://commons.wikimedia.org/wiki/Special:FilePath/Tiger.jpg")).toBe(
      "https://commons.wikimedia.org/wiki/Special:FilePath/Tiger.jpg",
    );
  });

  it("keeps https URLs as they are", () => {
    expect(secureUrl("https://www.gbif.org/occurrence/1")).toBe("https://www.gbif.org/occurrence/1");
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://example.com/a.jpg", "not a url", "", undefined])(
    "rejects %s",
    (value) => {
      expect(secureUrl(value)).toBeUndefined();
    },
  );
});

describe("getJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the parsed body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"ok":true}')));
    await expect(getJson("https://api.gbif.org/v1/x")).resolves.toEqual({ ok: true });
  });

  it("throws with the host and status when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("busy", { status: 503 })));
    await expect(getJson("https://api.gbif.org/v1/x")).rejects.toThrow("Request failed with status 503: https://api.gbif.org/v1/x");
  });
});
