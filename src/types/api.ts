/**
 * types/api.ts - Definisi Tipe Data REST API Backend UdaraSiaga
 */

export type HazardType = "volcano" | "fire";
export type ModelingMode = "auto" | "experiment";

export interface HealthResponse {
  status: string;
  project: string;
  version: string;
  disclaimer: string;
}

export interface SummaryKpiResponse {
  volcanoes?: {
    total_monitored: number;
    level_4_awas: number;
    level_3_siaga: number;
    level_2_waspada: number;
    level_1_normal: number;
  };
  wildfire_hotspots?: {
    active_24h_firms: number;
    source: string;
  };
}

export interface LiveSyncResponse {
  status: string;
  sources: Record<string, string>;
  latency_ms: number;
  timestamp: string;
}

export interface SimulationOverrides {
  column_height_km?: number;
  frp_scale?: number;
  wind_reverse_troposphere?: boolean;
  rain_scavenging_mm_h?: number;
  [key: string]: any;
}

export interface SimulationPayload {
  hazard: HazardType;
  mode: ModelingMode;
  source: {
    event_id: string;
    latitude?: number;
    longitude?: number;
    name?: string;
  };
  horizon_hours: number;
  n_members: number;
  seed: number;
  thresholds: {
    min: number;
    mid: number;
    max: number;
  };
  overrides?: Record<string, any> | null;
}

export interface SimulationResponse {
  run_id: string;
  hazard: HazardType;
  status: string;
  n_members: number;
  scenario_label: string;
  hourly_tiers?: Record<string, any>;
}

export interface ImpactRange {
  min: number;
  median: number;
  max: number;
}

export interface ImpactResponse {
  run_id: string;
  population_exposed: ImpactRange;
  children_exposed: ImpactRange;
  elderly_exposed: ImpactRange;
  area_exposed_km2: ImpactRange;
  agricultural_impact_ha?: number;
  water_sources_count?: number;
}

export interface ValidationResponse {
  event_id?: string;
  hazard?: string;
  resolution?: string;
  validation_note?: string;
  status?: string;
  not_testable_reason?: string;
  members_source?: string;
  reported_districts_evaluated?: string[];
  district_hit_rate?: number;
  hit_rate_pct?: number;
  fractions_skill_score?: number;
  fss_score?: number;
  aviation_impact?: {
    airport_name?: string;
    label?: string;
    reported_event?: string;
    airspace_exposure_probability?: number;
    dispersion_altitude_fl?: string;
    consistency?: string;
    caveat?: string;
  };
  confidence_caveat?: string;
  grid_search_spread_inflation?: Array<{
    inflation_factor: number;
    fss: number;
    district_overlap_pct: number;
  }>;
  reference_observation?: string;
  timestamp?: string;
}


// ---------- National map modes (/layers/wind, /layers/heatmap, /layers/smoke-paths) ----------

export interface WindGridSpec {
  lat0: number;
  lon0: number;
  dlat: number;
  dlon: number;
  nlat: number;
  nlon: number;
}

/** u/v in m/s; u[t][cell] with cell = iLat * nlon + iLon. */
export interface WindFieldResponse {
  available: boolean;
  reason?: string;
  generated_at: string;
  source?: string;
  fetched_at?: string;
  origin?: "live" | "cache" | "snapshot";
  stale?: boolean;
  is_example?: boolean;
  level?: "10m" | "850hPa";
  units?: string;
  step_hours?: number;
  grid?: WindGridSpec;
  times?: string[];
  u?: number[][];
  v?: number[][];
  note?: string;
}

export interface HeatCell {
  lat: number;
  lon: number;
  count: number;
  frp_sum: number;
}

export interface HeatmapResponse {
  available: boolean;
  reason?: string;
  kind?: string;
  cell_deg?: number;
  window_start?: string;
  as_of?: string;
  source?: string;
  is_example?: boolean;
  max_count?: number;
  max_frp_sum?: number;
  cells: HeatCell[];
}

export interface SmokePath {
  source_type: "fire" | "volcano";
  name: string;
  source: { lat: number; lon: number };
  frp_sum?: number;
  level?: number;
  wind_level: "10m" | "850hPa";
  coords: [number, number][];
}

export interface SmokePathsResponse {
  available: boolean;
  reason?: string;
  hours?: number;
  start_time?: string;
  marks_every_h?: number;
  wind_fetched_at?: string;
  stale?: boolean;
  fires_as_of?: string;
  note?: string;
  paths: SmokePath[];
}
