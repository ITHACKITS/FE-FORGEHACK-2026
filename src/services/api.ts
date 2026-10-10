/**
 * services/api.ts - Klien REST API UdaraSiaga Terenkapsulasi & Type-Safe
 */

import { CONFIG } from "../config/constants";
import type {
  HealthResponse,
  SummaryKpiResponse,
  LiveSyncResponse,
  SimulationPayload,
  SimulationResponse,
  ImpactResponse,
  ValidationResponse,
  WindFieldResponse,
  HeatmapResponse,
  SmokePathsResponse,
  AdviceResponse
} from "../types/api";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${CONFIG.API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      ...options
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `HTTP ${res.status}`);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
}

// The volcano and forest catalogues are read by several components; share one request each.
let volcanoesRequest: Promise<any> | null = null;
let forestsRequest: Promise<any> | null = null;
function once(get: () => Promise<any> | null, set: (p: Promise<any> | null) => void, endpoint: string): Promise<any> {
  const cached = get();
  if (cached) return cached;
  const p = request<any>(endpoint).catch((err) => { set(null); throw err; });
  set(p);
  return p;
}

export const api = {
  getHealth: () => request<HealthResponse>("/health"),
  getWind: (level: "10m" | "850hPa", hours: number) =>
    request<WindFieldResponse>(`/layers/wind?level=${level}&hours=${hours}`),
  getHeatmap: (days: number) => request<HeatmapResponse>(`/layers/heatmap?kind=fires&days=${days}`),
  getSmokePaths: (hours: number) => request<SmokePathsResponse>(`/layers/smoke-paths?hours=${hours}`),
  getSummaryKpi: () => request<SummaryKpiResponse>("/layers/summary-kpi"),
  syncLive: () => request<LiveSyncResponse>("/layers/sync-live", { method: "POST" }),

  getCoastline: () => request<any>("/layers/coastline"),
  getNationalVolcanoes: () => once(() => volcanoesRequest, (p) => { volcanoesRequest = p; }, "/layers/volcanoes-national"),
  getHotspots: (eventId = "live_kalimantan") => request<any>(`/layers/hotspots?event_id=${eventId}`),
  getFacilities: () => request<any>("/layers/facilities"),

  runSimulation: (payload: SimulationPayload) =>
    request<SimulationResponse>("/simulate", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  getImpact: (runId: string) => request<ImpactResponse>(`/runs/${runId}/impact`),
  getValidation: (eventId: string) => request<ValidationResponse>(`/validation/${eventId}`),
  getTiersAtHour: (runId: string, hour: number) => request<any>(`/runs/${runId}/tiers?t=${hour}`),
  getEvents: () => request<any>("/events"),
  getNearbyAdvice: (lat: number, lon: number, lang: "en" | "id") =>
    request<AdviceResponse>(`/advice/nearby?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&lang=${lang}`),
  getNationalForests: () => once(() => forestsRequest, (p) => { forestsRequest = p; }, "/layers/forests"),
  playDemo: (eventId: string) => request<any>(`/demo/play/${eventId}`)
};
