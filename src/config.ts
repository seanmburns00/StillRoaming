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

export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");
