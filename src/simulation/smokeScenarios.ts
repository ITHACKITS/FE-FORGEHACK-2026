/**
 * simulation/smokeScenarios.ts - Example (dummy) sources and wind field for the
 * smoke/ash particle simulation. Everything here is placeholder data until the
 * backend exposes real wind and source endpoints; the UI must label it "Example data".
 */

import type { HazardType, SimulationOverrides } from "../types/api";

export interface SmokeSource {
  lat: number;
  lng: number;
  /** Lowest injection altitude above sea level (m). */
  baseAltM: number;
  /** Highest injection altitude above sea level (m). */
  topAltM: number;
  /** Relative emission weight (FRP for fires, 1 for a volcanic vent). */
  weight: number;
}

export interface SmokeScenario {
  key: string;
  hazard: HazardType;
  label: string;
  /** Representative point used for the wind readout and camera framing. */
  center: { lat: number; lng: number };
  sources: SmokeSource[];
  /** Wind field sampler: returns u (east) and v (north) in m/s. */
  wind: (lat: number, lng: number, hour: number, altM: number) => { u: number; v: number };
  /** Rain intensity (mm/h) at a given forecast hour, used for wet removal. */
  rainAt: (hour: number) => number;
}

interface VolcanoSeed { name: string; lat: number; lng: number; summitM: number; columnKm: number }
interface FireSeed { name: string; lat: number; lng: number; spreadKm: number; hotspots: number }

const VOLCANOES: Record<string, VolcanoSeed> = {
  anak_krakatau_2026_09: { name: "Mt. Anak Krakatau", lat: -6.102, lng: 105.423, summitM: 157, columnKm: 5 },
  merapi_yogyakarta: { name: "Mt. Merapi", lat: -7.540, lng: 110.446, summitM: 2930, columnKm: 3 },
  lewotobi_laki_laki: { name: "Mt. Lewotobi Laki-laki", lat: -8.538, lng: 122.768, summitM: 1584, columnKm: 8 },
  marapi_sumatera: { name: "Mt. Marapi", lat: -0.381, lng: 100.473, summitM: 2891, columnKm: 3 },
  semeru: { name: "Mt. Semeru", lat: -8.108, lng: 112.922, summitM: 3676, columnKm: 2 },
  agung: { name: "Mt. Agung", lat: -8.343, lng: 115.508, summitM: 3031, columnKm: 4 },
  rinjani: { name: "Mt. Rinjani", lat: -8.420, lng: 116.470, summitM: 3726, columnKm: 3 },
  sinabung: { name: "Mt. Sinabung", lat: 3.170, lng: 98.392, summitM: 2460, columnKm: 4 }
};

const FIRES: Record<string, FireSeed> = {
  hutan_sebangau: { name: "Sebangau National Park", lat: -2.55, lng: 113.65, spreadKm: 18, hotspots: 14 },
  hutan_eks_plg: { name: "Ex-PLG Peatland", lat: -2.90, lng: 114.40, spreadKm: 25, hotspots: 18 },
  live_kalimantan: { name: "Central Kalimantan peatland", lat: -2.20, lng: 113.90, spreadKm: 40, hotspots: 24 }
};

/** Small deterministic PRNG so the same scenario always produces the same plume. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const DEG = Math.PI / 180;

/**
 * Dummy wind loosely shaped like the October dry-season pattern over Indonesia:
 * south-easterly trade winds near the ground, east-north-easterly flow aloft,
 * a slow synoptic swing, a diurnal wobble and gentle spatial meanders so plumes curve.
 */
function makeWind(seed: number, reverse: boolean) {
  const rnd = mulberry32(seed);
  const phase1 = rnd() * Math.PI * 2;
  const phase2 = rnd() * Math.PI * 2;
  const swingDeg = 20 + rnd() * 20;

  return (lat: number, lng: number, hour: number, altM: number) => {
    // Blend between the low-level and upper-level regime by altitude.
    const k = Math.min(1, Math.max(0, (altM - 1500) / 6000));
    const lowFrom = 125;   // wind coming FROM the south-east
    const highFrom = 70;   // wind coming FROM the east-north-east
    const fromDeg =
      lowFrom * (1 - k) + highFrom * k +
      swingDeg * Math.sin((hour / 30) * Math.PI * 2 + phase1) +
      8 * Math.sin((hour / 24) * Math.PI * 2 + phase2) +
      14 * Math.sin(lat * 1.7 + lng * 0.9 + hour * 0.05);
    const speed =
      (4 * (1 - k) + 9 * k) *
      (1 + 0.25 * Math.sin((hour / 18) * Math.PI * 2 + phase2) + 0.12 * Math.cos(lng * 1.3 - lat));
    // Meteorological "from" direction -> vector pointing where the air goes.
    const toRad = (fromDeg + 180) * DEG;
    const s = reverse ? -1 : 1;
    return { u: s * speed * Math.sin(toRad), v: s * speed * Math.cos(toRad) };
  };
}

/**
 * Build the example scenario for the selected hazard/event. Experiment-mode overrides
 * (column height, FRP scale, wind reversal, rain) reshape the dummy plume so the
 * controls visibly do something before the backend is connected.
 */
export function buildSmokeScenario(
  hazard: HazardType,
  eventId: string,
  overrides: SimulationOverrides | null
): SmokeScenario {
  const reverse = Boolean(overrides?.wind_reverse_troposphere);
  const rainMm = overrides?.rain_scavenging_mm_h ?? 0;
  // Same timing the backend uses for the rain override: starts at T+4 h, lasts 6 h.
  const rainAt = (hour: number) => (rainMm > 0 && hour >= 4 && hour < 10 ? rainMm : 0);
  const key = `${hazard}:${eventId}:${JSON.stringify(overrides ?? {})}`;
  const seed = hashString(`${hazard}:${eventId}`);

  if (hazard === "volcano") {
    const v = VOLCANOES[eventId] ?? VOLCANOES.anak_krakatau_2026_09;
    const columnKm = overrides?.column_height_km ?? v.columnKm;
    const top = v.summitM + columnKm * 1000;
    return {
      key,
      hazard,
      label: v.name,
      center: { lat: v.lat, lng: v.lng },
      sources: [{ lat: v.lat, lng: v.lng, baseAltM: v.summitM + 300, topAltM: top, weight: 1 }],
      wind: makeWind(seed, reverse),
      rainAt
    };
  }

  const f = FIRES[eventId] ?? FIRES.hutan_sebangau;
  const frpScale = overrides?.frp_scale ?? 1;
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  const sources: SmokeSource[] = [];
  for (let i = 0; i < f.hotspots; i++) {
    const r = f.spreadKm * Math.sqrt(rnd());
    const a = rnd() * Math.PI * 2;
    const frp = (8 + rnd() * 60) * frpScale;
    sources.push({
      lat: f.lat + (r * Math.sin(a)) / 111.32,
      lng: f.lng + (r * Math.cos(a)) / (111.32 * Math.cos(f.lat * DEG)),
      baseAltM: 30,
      // Hotter fires loft smoke higher; smouldering peat stays mostly below ~1.5 km.
      topAltM: 300 + 120 * Math.sqrt(frp),
      weight: frp
    });
  }
  return {
    key,
    hazard,
    label: f.name,
    center: { lat: f.lat, lng: f.lng },
    sources,
    wind: makeWind(seed, reverse),
    rainAt
  };
}

/** Compass label for a wind vector, as the direction the wind blows FROM. */
export function windFromLabel(u: number, v: number): string {
  const toDeg = (Math.atan2(u, v) / DEG + 360) % 360;
  const fromDeg = (toDeg + 180) % 360;
  const names = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return names[Math.round(fromDeg / 22.5) % 16];
}
