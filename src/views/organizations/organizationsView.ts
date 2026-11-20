import { CONSERVATION_ORGS } from "../../config";
import { el } from "../../ui/dom";

export function mountOrganizationsView(outlet: HTMLElement): () => void {
  const orgs = [...CONSERVATION_ORGS].sort((a, b) => a.name.localeCompare(b.name));
  outlet.append(
    el(
      "section",
      { className: "book" },
      el(
        "div",
        { className: "page page--single" },
        el("h2", {}, "Conservation organizations"),
        el(
          "p",
          { className: "lede" },
          "These groups work in the field to protect threatened mammals and the places they live. Still Roaming isn't affiliated with any of them and receives nothing from donations.",
        ),
        el(
          "ul",
          { className: "org-list" },
          ...orgs.map((org) =>
            el(
              "li",
              {},
              el(
                "article",
                { className: "org" },
                el("h3", {}, org.name),
                el("p", { className: "org__focus" }, org.focus),
                el("p", {}, org.blurb),
                el("a", { href: org.url, target: "_blank", rel: "noopener", className: "button", ariaLabel: `Support ${org.name}` }, "Support →"),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  return () => {};
}
