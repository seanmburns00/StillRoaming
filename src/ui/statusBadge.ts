import { IUCN_CATEGORIES, type IucnCategory } from "../models/iucn";
import { el } from "./dom";

export function statusBadge(category?: IucnCategory, label?: string): HTMLSpanElement {
  const text = label ?? (category ? IUCN_CATEGORIES[category].label : "Status unknown");
  return el("span", { className: `status-badge status-badge--${category ?? "unknown"}` }, text);
}
