/**
 * utils/apiLabels.ts - Shows API data (volcano levels, names, regions, forests) in the active
 * UI language. The backend stores these in Indonesian; English labels are mapped here.
 * Unknown values fall back to the original text.
 */

import type { Language } from "./translations";

const LEVELS: Record<Language, string[]> = {
  en: ["", "Level I (Normal)", "Level II (Advisory)", "Level III (Watch)", "Level IV (Warning)"],
  id: ["", "Level I (Normal)", "Level II (Waspada)", "Level III (Siaga)", "Level IV (Awas)"]
};

/** PVMBG alert level 1-4 with its name, e.g. "Level III (Watch)" / "Level III (Siaga)". */
export function volcanoLevel(level: number | undefined, lang: Language): string {
  const n = Math.min(4, Math.max(1, Math.round(level || 1)));
  return LEVELS[lang][n];
}

/** "G. Merapi" (ID) <-> "Mt. Merapi" (EN). */
export function volcanoName(name: string, lang: Language): string {
  const bare = name.replace(/^(G\.|Mt\.|Gunung|Mount)\s*/i, "");
  if (bare === name) return name;
  return lang === "id" ? `G. ${bare}` : `Mt. ${bare}`;
}

const REGIONS_EN: Record<string, string> = { Sumatera: "Sumatra", Jawa: "Java" };
const REGIONS_ID: Record<string, string> = { Sumatra: "Sumatera", Java: "Jawa" };

export function regionName(region: string, lang: Language): string {
  return (lang === "id" ? REGIONS_ID[region] : REGIONS_EN[region]) ?? region;
}

// Province names inside free-text location strings, longest first.
const PROVINCES_EN: [string, string][] = [
  ["Nusa Tenggara Barat", "West Nusa Tenggara"],
  ["Nusa Tenggara Timur", "East Nusa Tenggara"],
  ["Maluku Barat Daya", "Southwest Maluku"],
  ["Sumatera Selatan", "South Sumatra"],
  ["Sumatera Barat", "West Sumatra"],
  ["Sumatera Utara", "North Sumatra"],
  ["Sulawesi Utara", "North Sulawesi"],
  ["Maluku Tengah", "Central Maluku"],
  ["Maluku Utara", "North Maluku"],
  ["Jawa Tengah", "Central Java"],
  ["Jawa Barat", "West Java"],
  ["Jawa Timur", "East Java"],
  ["Selat Sunda", "Sunda Strait"],
  ["Sulteng", "Central Sulawesi"],
  ["Sulut", "North Sulawesi"]
];

// Regency names that end in a direction: "Flores Timur" -> "East Flores".
const DIRECTIONS_EN: Record<string, string> = {
  "Barat Daya": "Southwest", "Barat Laut": "Northwest",
  Timur: "East", Barat: "West", Utara: "North", Selatan: "South", Tengah: "Central"
};
const DIRECTION_RE = /^(.+?) (Barat Daya|Barat Laut|Timur|Barat|Utara|Selatan|Tengah)$/;

export function provinceName(text: string, lang: Language): string {
  if (lang === "id" || !text) return text;
  const withProvinces = PROVINCES_EN.reduce((s, [id, en]) => s.split(id).join(en), text);
  return withProvinces
    .split(/(, | \/ )/)
    .map((part) => {
      const m = part.match(DIRECTION_RE);
      return m ? `${DIRECTIONS_EN[m[2]]} ${m[1]}` : part;
    })
    .join("");
}

const RISK_EN: Record<string, string> = {
  "Sangat Rawan": "Very high risk",
  Rawan: "High risk",
  Waspada: "Watch"
};

export function forestRisk(risk: string | undefined, lang: Language): string {
  if (!risk) return lang === "id" ? "Rawan" : "High risk";
  return lang === "id" ? risk : RISK_EN[risk] ?? risk;
}

const FOREST_TYPES_EN: Record<string, string> = {
  "Cagar Biosfer Rawa Gambut": "Peat swamp biosphere reserve",
  "Hutan Dataran Rendah & Gambut": "Lowland & peat forest",
  "Hutan Dataran Rendah & Rawa": "Lowland & swamp forest",
  "Hutan Hujan Dataran Rendah": "Lowland rainforest",
  "Hutan Hujan Tropis Dataran Rendah": "Tropical lowland rainforest",
  "Hutan Karst & Lindung Perbukitan": "Karst & protected hill forest",
  "Hutan Lereng Kering & Pinus": "Dry slope & pine forest",
  "Hutan Lindung Pegunungan": "Protected montane forest",
  "Hutan Lindung Penyangga Ibu Kota": "Capital buffer protection forest",
  "Hutan Musim & Savana Sembalun": "Monsoon forest & Sembalun savanna",
  "Hutan Musim Dataran Rendah": "Lowland monsoon forest",
  "Hutan Musim Kering Monsoonal": "Dry monsoon forest",
  "Hutan Musim Pegunungan": "Montane monsoon forest",
  "Hutan Pegunungan Konservasi": "Conservation montane forest",
  "Hutan Pegunungan Tropis": "Tropical montane forest",
  "Hutan Perbukitan Tropis": "Tropical hill forest",
  "Hutan Rawa & Dataran Rendah": "Swamp & lowland forest",
  "Hutan Rawa Gambut & Hutan Tropis": "Peat swamp & tropical forest",
  "Hutan Rawa Gambut & Perbukitan": "Peat swamp & hill forest",
  "Hutan Rawa Gambut Tropis": "Tropical peat swamp forest",
  "Kawasan Gambut Pesisir": "Coastal peatland",
  "Kawasan Hidrologis Gambut Kritis": "Critical peat hydrological unit",
  "Lahan Basah & Hutan Rawa Musiman": "Wetland & seasonal swamp forest",
  "Padang Savana Alami & Hutan Musim": "Natural savanna & monsoon forest",
  "Padang Savana Tropis Luas": "Extensive tropical savanna",
  "Rawa Gambut Pedalaman Papua": "Inland Papuan peat swamp",
  "Rawa Gambut Pesisir Kering": "Dry coastal peat swamp",
  "Rawa Gambut Pesisir Pulau Kecil": "Small-island coastal peat swamp",
  "Rawa Gambut Terluas Asia Tenggara": "Southeast Asia's largest peat swamp",
  "Sabana Alpin & Semak Gunung": "Alpine savanna & mountain scrub",
  "Sabana Kaldera Dataran Tinggi": "Highland caldera savanna",
  "Sabana Kepulauan Kering": "Dry island savanna",
  "Sabana Lahan Basah Alami": "Natural wetland savanna",
  "Sabana Lereng Gunung & Kaldera": "Mountain slope & caldera savanna",
  "Sabana Tropis & Lahan Basah Melaleuca": "Tropical savanna & Melaleuca wetland",
  "Suaka Rawa Gambut Dalam": "Deep peat swamp reserve"
};

export function forestType(type: string | undefined, lang: Language): string {
  if (!type) return "";
  return lang === "id" ? type : FOREST_TYPES_EN[type] ?? type;
}

const FOREST_NAMES_EN: Record<string, string> = {
  "TN Tanjung Puting (Kotawaringin Barat, Kalteng)": "Tanjung Puting National Park (West Kotawaringin, Central Kalimantan)",
  "TN Sebangau (Palangka Raya, Kalteng)": "Sebangau National Park (Palangka Raya, Central Kalimantan)",
  "Hutan Lindung Pegunungan Meratus (Hulu Sungai, Kalsel)": "Meratus Mountains Protection Forest (Hulu Sungai, South Kalimantan)",
  "KHG Eks-PLG Sejuta Hektar (Pulang Pisau, Kalteng)": "Ex-PLG Million-Hectare Peat Unit (Pulang Pisau, Central Kalimantan)",
  "Lahan Gambut Landasan Ulin (Banjarbaru, Kalsel)": "Landasan Ulin Peatland (Banjarbaru, South Kalimantan)",
  "TN Berbak (Tanjung Jabung Timur, Jambi)": "Berbak National Park (East Tanjung Jabung, Jambi)",
  "Sabana Merauke - TN Wasur (Papua Selatan)": "Merauke Savanna - Wasur National Park (South Papua)",
  "TN Way Kambas (Lampung Timur, Lampung)": "Way Kambas National Park (East Lampung, Lampung)",
  "SM Padang Sugihan (OKI, Sumsel)": "Padang Sugihan Wildlife Reserve (OKI, South Sumatra)",
  "TN Bogani Nani Wartabone (Gorontalo & Sulut)": "Bogani Nani Wartabone National Park (Gorontalo & North Sulawesi)",
  "Lahan Gambut Mappi & Asmat (Papua Selatan)": "Mappi & Asmat Peatland (South Papua)",
  "TN Kutai (Kutai Timur & Bontang, Kaltim)": "Kutai National Park (East Kutai & Bontang, East Kalimantan)",
  "TN Gunung Palung (Ketapang, Kalbar)": "Gunung Palung National Park (Ketapang, West Kalimantan)",
  "SM Giam Siak Kecil (Bengkalis & Siak, Riau)": "Giam Siak Kecil Wildlife Reserve (Bengkalis & Siak, Riau)",
  "Lahan Gambut Rasau Jaya (Kubu Raya, Kalbar)": "Rasau Jaya Peatland (Kubu Raya, West Kalimantan)",
  "KHG Pulau Tebing Tinggi (Kep. Meranti, Riau)": "Tebing Tinggi Island Peat Unit (Meranti Islands, Riau)",
  "Sabana TN Rawa Aopa Watumohai (Konawe, Sultra)": "Rawa Aopa Watumohai National Park Savanna (Konawe, Southeast Sulawesi)",
  "TN Lore Lindu (Poso & Sigi, Sulteng)": "Lore Lindu National Park (Poso & Sigi, Central Sulawesi)",
  "TN Bali Barat & Prapat Agung (Buleleng, Bali)": "West Bali National Park & Prapat Agung (Buleleng, Bali)",
  "TN Bukit Tiga Puluh (Indragiri Hulu, Riau)": "Bukit Tiga Puluh National Park (Indragiri Hulu, Riau)",
  "Hutan Lindung Gunung Lawu (Karanganyar, Jateng)": "Mount Lawu Protection Forest (Karanganyar, Central Java)",
  "Hutan Lindung Sungai Wain & IKN (Balikpapan, Kaltim)": "Sungai Wain Protection Forest & IKN (Balikpapan, East Kalimantan)",
  "Sabana Bekol - TN Baluran (Situbondo, Jatim)": "Bekol Savanna - Baluran National Park (Situbondo, East Java)",
  "TN Danau Sentarum (Kapuas Hulu, Kalbar)": "Danau Sentarum National Park (Kapuas Hulu, West Kalimantan)",
  "Sabana Padar & Loh Liang - TN Komodo (NTT)": "Padar & Loh Liang Savanna - Komodo National Park (East Nusa Tenggara)",
  "TN Gunung Ciremai (Kuningan, Jabar)": "Mount Ciremai National Park (Kuningan, West Java)",
  "Sabana Bromo - TN Bromo Tengger Semeru (Jatim)": "Bromo Savanna - Bromo Tengger Semeru National Park (East Java)",
  "Sabana TN Gunung Merbabu (Boyolali, Jateng)": "Mount Merbabu National Park Savanna (Boyolali, Central Java)",
  "Hutan Pesisir Teluk Bintuni (Papua Barat)": "Bintuni Bay Coastal Forest (West Papua)",
  "TN Alas Purwo (Banyuwangi, Jatim)": "Alas Purwo National Park (Banyuwangi, East Java)",
  "Sabana Kaldera TN Gunung Tambora (Bima, NTB)": "Mount Tambora National Park Caldera Savanna (Bima, West Nusa Tenggara)",
  "Hutan Lereng Sembalun - TN Gunung Rinjani (NTB)": "Sembalun Slope Forest - Mount Rinjani National Park (West Nusa Tenggara)",
  "TN Kerinci Seblat (Jambi & Sumbar)": "Kerinci Seblat National Park (Jambi & West Sumatra)",
  "Savana TN Manupeu Tanah Daru (Sumba Timur, NTT)": "Manupeu Tanah Daru National Park Savanna (East Sumba, East Nusa Tenggara)",
  "Hutan Karst Bantimurung (Maros, Sulsel)": "Bantimurung Karst Forest (Maros, South Sulawesi)",
  "TN Tesso Nilo (Pelalawan, Riau)": "Tesso Nilo National Park (Pelalawan, Riau)"
};

// Built-in example names (simulation/smokeScenarios.ts) in Indonesian.
const SCENARIO_NAMES_ID: Record<string, string> = {
  "Sebangau National Park": "Taman Nasional Sebangau",
  "Ex-PLG Peatland": "Lahan Gambut Eks-PLG",
  "Central Kalimantan peatland": "Lahan gambut Kalimantan Tengah"
};

export function forestName(name: string, lang: Language): string {
  if (lang === "id") return SCENARIO_NAMES_ID[name] ?? name;
  return FOREST_NAMES_EN[name] ?? name;
}

/** Smoke/ash path names from /layers/smoke-paths: "Fire cluster -3.12, 111.88" or "G. Merapi". */
export function pathName(name: string, lang: Language): string {
  if (name.startsWith("Fire cluster")) {
    if (lang === "en") return name;
    const coords = name.replace("Fire cluster", "").trim().replace(/(-?\d+)\.(\d+)/g, "$1,$2").replace(", ", "; ");
    return `Klaster api ${coords}`;
  }
  return volcanoName(name, lang);
}

const COMPASS_ID: Record<string, string> = {
  N: "U", NNE: "UTL", NE: "TL", ENE: "TTL", E: "T", ESE: "TTg", SE: "Tg", SSE: "STg",
  S: "S", SSW: "SBD", SW: "BD", WSW: "BBD", W: "B", WNW: "BBL", NW: "BL", NNW: "UBL"
};

/** Compass point the wind blows from: English (N, NNE...) or Indonesian (U, UTL...) abbreviations. */
export function compassLabel(en: string, lang: Language): string {
  return lang === "id" ? COMPASS_ID[en] ?? en : en;
}
