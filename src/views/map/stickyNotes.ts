import { CONSERVATION_ORGS } from "../../config";
import { el } from "../../ui/dom";

export function stickyNotes(): HTMLElement {
  return el(
    "aside",
    { className: "sticky-notes", ariaLabel: "Conservation organizations" },
    ...CONSERVATION_ORGS.map((org) =>
      el(
        "details",
        { className: "sticky-note" },
        el("summary", {}, org.name),
        el("p", {}, org.blurb),
        el("a", { href: org.donateUrl, target: "_blank", rel: "noopener" }, "Donate →"),
      ),
    ),
  );
}
