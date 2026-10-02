// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { el } from "./dom";

describe("el", () => {
  it("creates an element with properties and children", () => {
    const link = el("a", { href: "https://www.gbif.org/", className: "link" }, "GBIF");
    expect(link.outerHTML).toBe('<a href="https://www.gbif.org/" class="link">GBIF</a>');
  });

  it("inserts strings as text so API data can never inject markup", () => {
    const heading = el("h3", {}, '<img src=x onerror="alert(1)">');
    expect(heading.children).toHaveLength(0);
    expect(heading.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it("skips empty children so optional sections can be written inline", () => {
    const list = el("ul", {}, el("li", {}, "one"), undefined, null, false, "", el("li", {}, "two"));
    expect(list.outerHTML).toBe("<ul><li>one</li><li>two</li></ul>");
  });
});
