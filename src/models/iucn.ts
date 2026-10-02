export type IucnCategory = "CR" | "EN" | "VU";

export const IUCN_CATEGORIES: Record<IucnCategory, { label: string; wikidataId: string }> = {
  CR: { label: "Critically Endangered", wikidataId: "Q219127" },
  EN: { label: "Endangered", wikidataId: "Q96377276" },
  VU: { label: "Vulnerable", wikidataId: "Q278113" },
};

export const ALL_IUCN_CATEGORIES = Object.keys(IUCN_CATEGORIES) as IucnCategory[];

export function isIucnCategory(value: string | undefined): value is IucnCategory {
  return value !== undefined && value in IUCN_CATEGORIES;
}

export function categoryFromWikidataId(id: string | undefined): IucnCategory | undefined {
  return ALL_IUCN_CATEGORIES.find((category) => IUCN_CATEGORIES[category].wikidataId === id);
}
