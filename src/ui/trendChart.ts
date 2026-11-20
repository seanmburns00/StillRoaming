import { fetchSightingsByYear, type SightingScope, type YearCount } from "../api/gbif";
import { el } from "./dom";
import { sightingsLabel } from "./labels";

const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 320;
const PLOT_HEIGHT = 72;
const LABEL_ROOM = 14;
const AXIS_ROOM = 16;
const BAR_GAP = 2;
const CORNER = 2;

export function sightingTrend(scope: SightingScope, signal: AbortSignal, today = new Date()): HTMLElement {
  const figure = el("figure", { className: "trend" }, el("p", { className: "book-status" }, "Charting sightings by year…"));
  fetchSightingsByYear(scope, today.getFullYear(), signal)
    .then((years) => {
      if (!signal.aborted) figure.replaceChildren(...trendChart(years));
    })
    .catch((error: unknown) => {
      if (signal.aborted) return;
      console.error(error);
      figure.remove();
    });
  return figure;
}

export function trendChart(years: YearCount[]): Node[] {
  const first = years[0];
  const last = years.at(-1);
  if (!first || !last) return [];
  const peak = years.reduce((best, entry) => (entry.count > best.count ? entry : best), first);
  const barWidth = (WIDTH - BAR_GAP * (years.length - 1)) / years.length;
  const baseline = LABEL_ROOM + PLOT_HEIGHT;
  const x = (i: number) => i * (barWidth + BAR_GAP);

  const chart = svg(
    "svg",
    { viewBox: `0 0 ${WIDTH} ${baseline + AXIS_ROOM}`, class: "trend__chart", role: "img", "aria-label": trendSummary(years, peak) },
    ...years.map((entry, i) => {
      const height = peak.count === 0 ? 0 : (entry.count / peak.count) * PLOT_HEIGHT;
      return svg(
        "g",
        { class: "trend__year" },
        svg("title", {}, `${entry.year}: ${sightingsLabel(entry.count)}`),
        svg("rect", { x: x(i), y: LABEL_ROOM, width: barWidth + BAR_GAP, height: PLOT_HEIGHT, class: "trend__hit" }),
        height > 0 && svg("path", { d: roundedBar(x(i), baseline, barWidth, height), class: "trend__bar" }),
      );
    }),
    svg("line", { x1: 0, x2: WIDTH, y1: baseline, y2: baseline, class: "trend__axis" }),
    peak.count > 0 &&
      svg(
        "text",
        { x: x(years.indexOf(peak)) + barWidth / 2, y: baseline - (PLOT_HEIGHT + 4), "text-anchor": "middle", class: "trend__peak" },
        peak.count.toLocaleString(),
      ),
    svg("text", { x: 0, y: baseline + AXIS_ROOM - 3, class: "trend__tick" }, String(first.year)),
    svg("text", { x: WIDTH, y: baseline + AXIS_ROOM - 3, "text-anchor": "end", class: "trend__tick" }, String(last.year)),
  );

  return [
    el("figcaption", {}, el("strong", {}, "Photographed sightings per year")),
    chart,
    el(
      "p",
      { className: "trend__note" },
      "More sightings usually means more people photographing wildlife and sharing it, not more animals.",
    ),
    el(
      "details",
      { className: "trend__table" },
      el("summary", {}, "Show as a table"),
      el(
        "table",
        {},
        el("thead", {}, el("tr", {}, el("th", {}, "Year"), el("th", {}, "Sightings"))),
        el("tbody", {}, ...years.map((entry) => el("tr", {}, el("td", {}, String(entry.year)), el("td", {}, entry.count.toLocaleString())))),
      ),
    ),
  ];
}

export function trendSummary(years: YearCount[], peak: YearCount): string {
  const total = years.reduce((sum, entry) => sum + entry.count, 0);
  if (total === 0) return `No photographed sightings from ${years[0]?.year} to ${years.at(-1)?.year}.`;
  return `${sightingsLabel(total)} from ${years[0]?.year} to ${years.at(-1)?.year}, peaking at ${peak.count.toLocaleString()} in ${peak.year}.`;
}

export function roundedBar(x: number, baseline: number, width: number, height: number): string {
  const r = Math.min(CORNER, width / 2, height);
  const top = baseline - height;
  return `M${x},${baseline}V${top + r}Q${x},${top} ${x + r},${top}H${x + width - r}Q${x + width},${top} ${x + width},${top + r}V${baseline}Z`;
}

function svg(tag: string, attributes: Record<string, string | number>, ...children: (Node | string | false)[]): SVGElement {
  const element = document.createElementNS(SVG_NS, tag) as SVGElement;
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  element.append(...children.filter((child): child is Node | string => child !== false));
  return element;
}
