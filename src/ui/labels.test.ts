import { describe, expect, it } from "vitest";
import { sightingsLabel, speciesCountLabel } from "./labels";

describe("labels", () => {
  it("pluralizes and formats counts", () => {
    expect(sightingsLabel(1)).toBe("1 sighting");
    expect(sightingsLabel(0)).toBe("0 sightings");
    expect(sightingsLabel(1250)).toBe("1,250 sightings");
    expect(speciesCountLabel(1)).toBe("1 species");
    expect(speciesCountLabel(300)).toBe("300 species");
  });
});
