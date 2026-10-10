/**
 * simulation/nearbyLayers.ts - Radius-limited map landmarks.
 * Indonesia has thousands of hotspots and many volcanoes and forests, so the map only draws
 * what lies within a render radius of the map centre (100-500 km, from the zoom level).
 * Volcanoes at Level III/IV and the selected event are always drawn. Ash paths from
 * /layers/smoke-paths appear for Level III+ volcanoes inside the radius.
 * Hotspots use one shared canvas renderer instead of thousands of DOM markers.
 * Everything is recomputed on moveend only, never during a pan.
 */

import L from "leaflet";
import type { SmokePath } from "../types/api";

export const MIN_RADIUS_KM = 100;
export const MAX_RADIUS_KM = 500;
const ALWAYS_SHOW_LEVEL = 3;
const ASH_COLOR = "#c4b5fd";

export interface VolcanoFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    id: string;
    event_id?: string;
    name: string;
    level: number;
    level_name: string;
    color: string;
    radius_bahaya_km: number;
  };
}

export interface Forest {
  id: string;
  name: string;
  lat: number;
  lon: number;
  risk_level?: string;
  forest_type?: string;
}

interface HotspotFeature {
  geometry: { coordinates: [number, number] };
  properties: { frp?: number; acq_date?: string };
}

export interface NearbyStats {
  radiusKm: number;
  volcanoes: number;
  forests: number;
  hotspots: number;
  ashPaths: number;
}

export interface NearbyVisibility {
  volcanoes: boolean;
  forests: boolean;
  hotspots: boolean;
  ashPaths: boolean;
}

interface NearbyOptions {
  onSelectVolcano: (f: VolcanoFeature) => void;
  onSelectForest: (f: Forest) => void;
  onStats: (s: NearbyStats) => void;
}

/** Render radius: half the viewport diagonal, rounded to 50 km and clamped to 100-500 km. */
export function renderRadiusKm(map: L.Map): number {
  const b = map.getBounds();
  const halfDiagKm = map.getCenter().distanceTo(b.getNorthEast()) / 1000;
  const rounded = Math.round(halfDiagKm / 50) * 50;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, rounded));
}

/** Text-only tooltip content: names come from the API, so they are never parsed as HTML. */
function textTooltip(lines: string[]): HTMLElement {
  const el = document.createElement("div");
  lines.forEach((line, i) => {
    const row = document.createElement(i === 0 ? "strong" : "div");
    row.textContent = line;
    el.appendChild(row);
  });
  return el;
}

function volcanoIcon(level: number): L.DivIcon {
  const src = level === 4 ? "/4_awas.png" : level === 3 ? "/3_siaga.png" : level === 2 ? "/2_waspada.png" : "/1_normal.png";
  const pulse = level >= 3 ? `<span class="volcano-pulse-ring ${level === 4 ? "ring-red" : "ring-orange"}"></span>` : "";
  return L.divIcon({
    className: "volcano-div-icon",
    html: `<div class="relative flex items-center justify-center">${pulse}<img src="${src}" alt="" class="w-6 h-6 object-contain drop-shadow-md z-10 relative" style="transform:translateY(-2px)" /></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });
}

const FOREST_ICON = L.divIcon({
  className: "forest-div-icon",
  html: `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#14532d" stroke="#bbf7d0" stroke-width="1.5"/><path d="M12 4.5l4.5 6.2h-2.4l3.4 4.6H13v3.2h-2v-3.2H6.5l3.4-4.6H7.5z" fill="#bbf7d0"/></svg>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

function hotspotColor(frp: number): string {
  if (frp >= 100) return "#b91c1c";
  if (frp >= 30) return "#ea580c";
  return "#f59e0b";
}

export class NearbyLayers {
  private readonly map: L.Map;
  private readonly opts: NearbyOptions;
  private readonly renderer: L.Canvas;
  private readonly volcanoGroup = L.layerGroup();
  private readonly forestGroup = L.layerGroup();
  private readonly hotspotGroup = L.layerGroup();
  private readonly ashGroup = L.layerGroup();
  private readonly radiusRing: L.Circle;

  private volcanoes: { f: VolcanoFeature; ll: L.LatLng; marker: L.Marker }[] = [];
  private forests: { f: Forest; ll: L.LatLng; marker: L.Marker }[] = [];
  private hotspots: { ll: L.LatLng; marker: L.CircleMarker }[] = [];
  private ashPaths: { p: SmokePath; ll: L.LatLng; layer: L.LayerGroup }[] = [];
  private selectedId: string | null = null;
  private vis: NearbyVisibility = { volcanoes: true, forests: true, hotspots: true, ashPaths: true };
  private ringVisible = true;

  constructor(map: L.Map, opts: NearbyOptions) {
    this.map = map;
    this.opts = opts;
    this.renderer = L.canvas({ padding: 0.3 });
    this.radiusRing = L.circle(map.getCenter(), {
      radius: MIN_RADIUS_KM * 1000,
      color: "#34d399",
      weight: 1,
      opacity: 0.45,
      dashArray: "2 6",
      fill: false,
      interactive: false
    });
    [this.ashGroup, this.hotspotGroup, this.forestGroup, this.volcanoGroup].forEach((g) => g.addTo(map));
    this.radiusRing.addTo(map);
    map.on("moveend", this.update);
  }

  destroy() {
    this.map.off("moveend", this.update);
    [this.ashGroup, this.hotspotGroup, this.forestGroup, this.volcanoGroup, this.radiusRing].forEach((l) => l.remove());
  }

  setVolcanoes(features: VolcanoFeature[]) {
    this.volcanoGroup.clearLayers();
    this.volcanoes = features.map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const p = f.properties;
      const marker = L.marker([lat, lon], { icon: volcanoIcon(p.level), title: p.name, alt: p.name, keyboard: true });
      marker.bindTooltip(textTooltip([p.name, p.level_name]), { direction: "top", offset: [0, -10] });
      marker.on("click", () => this.opts.onSelectVolcano(f));
      return { f, ll: L.latLng(lat, lon), marker };
    });
    this.update();
  }

  setForests(list: Forest[]) {
    this.forestGroup.clearLayers();
    this.forests = list.map((f) => {
      const marker = L.marker([f.lat, f.lon], { icon: FOREST_ICON, title: f.name, alt: f.name, keyboard: true });
      marker.bindTooltip(textTooltip([f.name, [f.forest_type, f.risk_level].filter(Boolean).join(" · ")]), { direction: "top" });
      marker.on("click", () => this.opts.onSelectForest(f));
      return { f, ll: L.latLng(f.lat, f.lon), marker };
    });
    this.update();
  }

  setHotspots(features: HotspotFeature[]) {
    this.hotspotGroup.clearLayers();
    this.hotspots = features.map((f) => {
      const [lon, lat] = f.geometry.coordinates;
      const frp = Number(f.properties.frp) || 0;
      const marker = L.circleMarker([lat, lon], {
        renderer: this.renderer,
        radius: frp >= 100 ? 5 : 3.5,
        weight: 0.8,
        color: "#450a0a",
        fillColor: hotspotColor(frp),
        fillOpacity: 0.9
      });
      // Tooltip content is built on first hover, not up front for every point.
      marker.bindTooltip(() => `VIIRS hotspot · FRP ${frp ? frp.toFixed(0) : "-"} MW${f.properties.acq_date ? ` · ${f.properties.acq_date}` : ""}`, { direction: "top" });
      return { ll: L.latLng(lat, lon), marker };
    });
    this.update();
  }

  /** Ash paths for Level III+ volcanoes; drawn only when their volcano is inside the radius. */
  setAshPaths(paths: SmokePath[], marksEveryH = 24) {
    this.ashGroup.clearLayers();
    this.ashPaths = paths
      .filter((p) => p.source_type === "volcano" && (p.level ?? 0) >= ALWAYS_SHOW_LEVEL && p.coords.length > 1)
      .map((p) => {
        const layer = L.layerGroup();
        L.polyline(p.coords, { color: ASH_COLOR, weight: 2.4, opacity: 0.95, dashArray: "6 6", interactive: false }).addTo(layer);
        for (let h = marksEveryH; h < p.coords.length; h += marksEveryH) {
          L.circleMarker(p.coords[h], { renderer: this.renderer, radius: 3, color: ASH_COLOR, weight: 1.5, fillColor: "#0f172a", fillOpacity: 0.9 })
            .bindTooltip(textTooltip([`${p.name} · ash +${h} h`, "Model estimate, not an official warning"]), { direction: "top" })
            .addTo(layer);
        }
        return { p, ll: L.latLng(p.source.lat, p.source.lon), layer };
      });
    this.update();
  }

  setSelected(id: string | null) {
    this.selectedId = id;
    this.update();
  }

  setVisibility(vis: Partial<NearbyVisibility>) {
    this.vis = { ...this.vis, ...vis };
    this.update();
  }

  setRingVisible(on: boolean) {
    this.ringVisible = on;
    this.update();
  }

  /** Recompute which landmarks fall inside the render radius. */
  update = () => {
    const center = this.map.getCenter();
    const radiusKm = renderRadiusKm(this.map);
    const r = radiusKm * 1000;
    const inside = (ll: L.LatLng) => center.distanceTo(ll) <= r;

    this.radiusRing.setLatLng(center).setRadius(r);
    if (this.ringVisible) this.radiusRing.addTo(this.map);
    else this.radiusRing.remove();

    let nV = 0;
    for (const v of this.volcanoes) {
      const p = v.f.properties;
      const show = this.vis.volcanoes && (inside(v.ll) || p.level >= ALWAYS_SHOW_LEVEL || (p.event_id || p.id) === this.selectedId);
      this.toggle(this.volcanoGroup, v.marker, show);
      if (show) nV++;
    }

    let nF = 0;
    for (const f of this.forests) {
      const show = this.vis.forests && (inside(f.ll) || f.f.id === this.selectedId);
      this.toggle(this.forestGroup, f.marker, show);
      if (show) nF++;
    }

    let nH = 0;
    for (const h of this.hotspots) {
      const show = this.vis.hotspots && inside(h.ll);
      this.toggle(this.hotspotGroup, h.marker, show);
      if (show) nH++;
    }

    let nA = 0;
    for (const a of this.ashPaths) {
      const show = this.vis.ashPaths && inside(a.ll);
      this.toggle(this.ashGroup, a.layer, show);
      if (show) nA++;
    }

    this.opts.onStats({ radiusKm, volcanoes: nV, forests: nF, hotspots: nH, ashPaths: nA });
  };

  private toggle(group: L.LayerGroup, layer: L.Layer, show: boolean) {
    const has = group.hasLayer(layer);
    if (show && !has) group.addLayer(layer);
    else if (!show && has) group.removeLayer(layer);
  }
}
