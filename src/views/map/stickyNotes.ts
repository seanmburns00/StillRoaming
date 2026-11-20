import type { ConservationOrg } from "../../config";
import { routes } from "../../router";
import { el } from "../../ui/dom";

export function stickyNotes(orgs: readonly ConservationOrg[]): HTMLElement {
  return el(
    "aside",
    { className: "sticky-notes", ariaLabel: "Conservation organizations" },
    ...orgs.map((org) =>
      el(
        "details",
        { className: "sticky-note" },
        el("summary", {}, org.name),
        el("p", {}, org.blurb),
        el("a", { href: org.url, target: "_blank", rel: "noopener" }, "Support →"),
      ),
    ),
    el("a", { href: routes.organizations(), className: "sticky-notes__all" }, "All organizations →"),
  );
}
