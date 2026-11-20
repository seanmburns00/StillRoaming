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

export const SITE_URL = "https://seanmburns00.github.io/StillRoaming/";

export interface ConservationOrg {
  name: string;
  focus: string;
  blurb: string;
  url: string;
}

export const CONSERVATION_ORGS: readonly ConservationOrg[] = [
  {
    name: "WWF",
    focus: "Wildlife worldwide",
    blurb: "Protects tigers, elephants, rhinos and the habitats they depend on in nearly 100 countries.",
    url: "https://www.worldwildlife.org/donate",
  },
  {
    name: "Wildlife Conservation Society",
    focus: "Wildlife worldwide",
    blurb: "Runs field programs and parks protecting great apes, big cats and more across 60 countries.",
    url: "https://www.wcs.org/support",
  },
  {
    name: "Fauna & Flora",
    focus: "Wildlife worldwide",
    blurb: "The world's oldest international conservation charity, founded in 1903, working through local partners.",
    url: "https://www.fauna-flora.org/donate/",
  },
  {
    name: "Conservation International",
    focus: "Habitats worldwide",
    blurb: "Uses science, policy and partnerships with local communities to protect the places wildlife depends on.",
    url: "https://www.conservation.org/",
  },
  {
    name: "African Wildlife Foundation",
    focus: "African wildlife",
    blurb: "Works with communities across Africa to protect its wildlife and wild lands.",
    url: "https://www.awf.org/donate",
  },
  {
    name: "Panthera",
    focus: "Wild cats",
    blurb: "The only organization devoted exclusively to the world's 40 wild cat species.",
    url: "https://panthera.org/donate",
  },
  {
    name: "Snow Leopard Trust",
    focus: "Snow leopards",
    blurb: "Works with the communities that share the snow leopard's mountains to protect the cat and its habitat.",
    url: "https://snowleopard.org/donate/",
  },
  {
    name: "International Rhino Foundation",
    focus: "Rhinos",
    blurb: "Funds anti-poaching patrols and habitat work for all five rhino species.",
    url: "https://rhinos.org/donate/",
  },
  {
    name: "Save the Elephants",
    focus: "African elephants",
    blurb: "Tracks and protects African elephants, from GPS-collared herds to fighting the ivory trade.",
    url: "https://savetheelephants.org/donate/",
  },
  {
    name: "Jane Goodall Institute",
    focus: "Great apes",
    blurb: "Founded by Jane Goodall to protect chimpanzees, other great apes and their forest homes.",
    url: "https://janegoodall.org/",
  },
  {
    name: "Save Pangolins",
    focus: "Pangolins",
    blurb: "Funds research, rescue and anti-trafficking work for the world's most trafficked mammal.",
    url: "https://www.savepangolins.org/",
  },
  {
    name: "Australian Wildlife Conservancy",
    focus: "Australian mammals",
    blurb: "Runs sanctuaries that protect Australia's threatened marsupials and other native mammals.",
    url: "https://www.australianwildlife.org/donate/",
  },
];

export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");
