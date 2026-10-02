export const MAX_SIGHTINGS = 1500;

export const DEFAULT_LOOKBACK_DAYS = 30;

// Rodents, bats, shrews and whales are left out to keep the map focused on recognisable land mammals.
// Lagomorphs are left out because European rabbits are "Endangered" only in their native range,
// which would flood the map with garden rabbits.
export const MAMMAL_ORDERS = [
  { name: "Primates", title: "Primates", gbifKey: 798 },
  { name: "Carnivora", title: "Carnivores", gbifKey: 732 },
  { name: "Artiodactyla", title: "Even-toed hoofed mammals", gbifKey: 731 },
  { name: "Perissodactyla", title: "Odd-toed hoofed mammals", gbifKey: 795 },
  { name: "Proboscidea", title: "Elephants", gbifKey: 799 },
  { name: "Pholidota", title: "Pangolins", gbifKey: 796 },
  { name: "Pilosa", title: "Anteaters and sloths", gbifKey: 1494 },
  { name: "Diprotodontia", title: "Kangaroos, koalas and kin", gbifKey: 1452 },
  { name: "Dasyuromorphia", title: "Marsupial carnivores", gbifKey: 736 },
  { name: "Monotremata", title: "Egg-laying mammals", gbifKey: 791 },
] as const;

// GBIF files these domestic animals under the same name as threatened wild relatives,
// so a handful of their records carry a threatened status.
export const DOMESTICATED_SPECIES_KEYS: readonly number[] = [
  2441110, // Domestic sheep, Ovis aries
  7422937, // Domestic water buffalo, Bubalus bubalis
  2441025, // Gayal, Bos frontalis
];

export type MammalOrderName = (typeof MAMMAL_ORDERS)[number]["name"];

export const CONSERVATION_ORGS = [
  {
    name: "WWF",
    blurb: "Protects tigers, elephants, rhinos and the habitats they depend on in nearly 100 countries.",
    donateUrl: "https://www.worldwildlife.org/donate",
  },
  {
    name: "Panthera",
    blurb: "The only organization devoted exclusively to the world's 40 wild cat species.",
    donateUrl: "https://panthera.org/donate",
  },
  {
    name: "International Rhino Foundation",
    blurb: "Funds anti-poaching patrols and habitat work for all five rhino species.",
    donateUrl: "https://rhinos.org/donate/",
  },
  {
    name: "Wildlife Conservation Society",
    blurb: "Runs field programs and parks protecting great apes, big cats and more across 60 countries.",
    donateUrl: "https://www.wcs.org/support",
  },
] as const;
