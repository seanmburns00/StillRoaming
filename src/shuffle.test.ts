import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("keeps every item exactly once and leaves the original alone", () => {
    const items = [1, 2, 3, 4, 5];
    for (let i = 0; i < 20; i += 1) {
      expect([...shuffle(items)].sort()).toEqual(items);
    }
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it("can put any item first", () => {
    expect(shuffle(["a", "b", "c"], () => 0)[0]).toBe("b");
    expect(shuffle(["a", "b", "c"], () => 0.99)[0]).toBe("a");
  });
});
