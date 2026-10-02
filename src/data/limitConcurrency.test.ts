import { describe, expect, it } from "vitest";
import { limitConcurrency } from "./limitConcurrency";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => (resolve = done));
  return { promise, resolve };
}

describe("limitConcurrency", () => {
  it("never runs more tasks at once than allowed, and runs them all", async () => {
    const limit = limitConcurrency(2);
    let running = 0;
    let peak = 0;
    const gates = Array.from({ length: 6 }, deferred);

    const tasks = gates.map((gate, i) =>
      limit(async () => {
        running += 1;
        peak = Math.max(peak, running);
        await gate.promise;
        running -= 1;
        return i;
      }),
    );
    for (const gate of gates) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      gate.resolve();
    }

    await expect(Promise.all(tasks)).resolves.toEqual([0, 1, 2, 3, 4, 5]);
    expect(peak).toBe(2);
  });

  it("frees the slot when a task fails", async () => {
    const limit = limitConcurrency(1);
    await expect(limit(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(limit(() => Promise.resolve("next"))).resolves.toBe("next");
  });
});
