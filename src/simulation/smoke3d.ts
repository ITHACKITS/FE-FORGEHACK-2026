/**
 * simulation/smoke3d.ts - Shows SmokeEngine output on a Google Maps <gmp-map-3d> element.
 * Map3D has no custom-canvas hook, so the plume is approximated by translucent polygon
 * slices: particles are grouped by altitude band and age, and each group becomes one
 * hull floating at the group's mean altitude. Stacked slices read as a 3D plume that
 * shears with height (low smoke and high ash drift in different directions).
 */

import type { SmokeEngine } from "./smokeEngine";

interface LatLngAlt { lat: number; lng: number; altitude: number }
interface Slice { ring: LatLngAlt[]; fill: string; stroke: string }

const DEG = Math.PI / 180;
const M_PER_DEG = 111_320;
const AGE_EDGES = [0, 1.5, 4, 8, 14, 22, 32, 50];
const SMOKE_ATTR = "data-smoke-3d";

let syncToken = 0;
const framedScenario = new WeakMap<HTMLElement, string>();

/** Andrew's monotone chain convex hull on [x, y] points. */
function convexHull(points: [number, number][]): [number, number][] {
  if (points.length < 3) return points.slice();
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function buildSlices(engine: SmokeEngine): Slice[] {
  const isAsh = engine.scenario.hazard === "volcano";
  const bandM = isAsh ? 1500 : 400;
  const lat0 = engine.scenario.center.lat;
  const kx = Math.cos(lat0 * DEG);

  // Group particle indices by (altitude band, age band).
  const groups = new Map<string, number[]>();
  for (let i = 0; i < engine.count; i++) {
    const age = engine.age[i];
    let a = 0;
    while (a < AGE_EDGES.length - 2 && age >= AGE_EDGES[a + 1]) a++;
    const key = `${Math.floor(engine.alt[i] / bandM)}:${a}`;
    let g = groups.get(key);
    if (!g) groups.set(key, (g = []));
    g.push(i);
  }

  const slices: Slice[] = [];
  for (const [key, idx] of groups) {
    if (idx.length < 6) continue;
    const ageBand = Number(key.split(":")[1]);
    let altSum = 0;
    let cx = 0;
    let cy = 0;
    const pts: [number, number][] = idx.map((i) => {
      altSum += engine.alt[i];
      const p: [number, number] = [engine.lng[i] * kx, engine.lat[i]];
      cx += p[0];
      cy += p[1];
      return p;
    });
    cx /= idx.length;
    cy /= idx.length;
    const hull = convexHull(pts);
    if (hull.length < 3) continue;

    // Pad the hull outward by a puff radius so thin groups still read as a cloud.
    const meanAge = (AGE_EDGES[ageBand] + AGE_EDGES[ageBand + 1]) / 2;
    const padDeg = ((isAsh ? 1500 : 900) + 1500 * Math.sqrt(meanAge)) / M_PER_DEG;
    const altitude = altSum / idx.length;
    const ring = hull.map(([x, y]) => {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      return { lat: y + (dy / d) * padDeg, lng: (x + (dx / d) * padDeg) / kx, altitude };
    });

    // Denser, younger groups are darker and more opaque.
    const t = ageBand / (AGE_EDGES.length - 2);
    const shade = Math.round((isAsh ? 70 : 95) + t * (isAsh ? 90 : 95));
    const alpha = Math.min(0.55, 0.12 + idx.length / 500) * (1 - 0.55 * t);
    const rgb = isAsh ? `${shade},${shade - 8},${shade - 14}` : `${shade},${shade - 12},${shade - 22}`;
    slices.push({
      ring,
      fill: `rgba(${rgb},${alpha.toFixed(3)})`,
      stroke: `rgba(${rgb},${Math.min(0.7, alpha + 0.15).toFixed(3)})`
    });
  }
  // Draw low slices first so higher ones layer on top.
  slices.sort((a, b) => a.ring[0].altitude - b.ring[0].altitude);
  return slices;
}

/** Map3D renamed coordinate properties across versions; set whichever this build supports. */
function setPath(el: any, coords: LatLngAlt[], legacyName: "outerCoordinates" | "coordinates") {
  if ("path" in el) el.path = coords;
  else el[legacyName] = coords;
}

async function whenMaps3dReady(): Promise<boolean> {
  const g = (window as any).google;
  if (g?.maps?.importLibrary) {
    try { await g.maps.importLibrary("maps3d"); } catch { /* fall through to the element check */ }
  }
  if (customElements.get("gmp-polygon-3d")) return true;
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000));
  const defined = customElements.whenDefined("gmp-polygon-3d").then(() => true);
  return Promise.race([defined, timeout]);
}

/** Remove every smoke element this module added to the 3D map. */
export function clearSmoke3D(mapEl: HTMLElement | null) {
  syncToken++;
  mapEl?.querySelectorAll(`[${SMOKE_ATTR}]`).forEach((n) => n.remove());
}

/**
 * Replace the smoke slices on the 3D map with the state at `hour`.
 * Resolves to an error message when the Maps 3D build lacks the needed elements.
 */
export async function syncSmoke3D(mapEl: HTMLElement, engine: SmokeEngine, hour: number): Promise<string | null> {
  const token = ++syncToken;
  const ready = await whenMaps3dReady();
  if (token !== syncToken) return null;
  if (!ready) return "This Google Maps 3D build has no 3D polygon support.";

  engine.advanceTo(hour);
  const sc = engine.scenario;
  const slices = buildSlices(engine);
  const fragment = document.createDocumentFragment();

  try {
    for (const s of slices) {
      const poly = document.createElement("gmp-polygon-3d") as any;
      poly.setAttribute(SMOKE_ATTR, "");
      poly.altitudeMode = "ABSOLUTE";
      poly.fillColor = s.fill;
      poly.strokeColor = s.stroke;
      poly.strokeWidth = 1;
      poly.drawsOccludedSegments = true;
      setPath(poly, s.ring, "outerCoordinates");
      fragment.appendChild(poly);
    }

    if (sc.hazard === "volcano") {
      // The eruption column, from the vent to the top of the injection height.
      const src = sc.sources[0];
      const column = document.createElement("gmp-polyline-3d") as any;
      column.setAttribute(SMOKE_ATTR, "");
      column.altitudeMode = "ABSOLUTE";
      column.strokeColor = "rgba(72,62,56,0.9)";
      column.strokeWidth = 14;
      column.drawsOccludedSegments = true;
      setPath(column, [
        { lat: src.lat, lng: src.lng, altitude: src.baseAltM - 300 },
        { lat: src.lat, lng: src.lng, altitude: src.topAltM }
      ], "coordinates");
      fragment.appendChild(column);
    } else {
      // Short glowing stalks mark the example fire sources.
      for (const src of sc.sources) {
        const stalk = document.createElement("gmp-polyline-3d") as any;
        stalk.setAttribute(SMOKE_ATTR, "");
        stalk.altitudeMode = "RELATIVE_TO_GROUND";
        stalk.strokeColor = "rgba(255,120,40,0.95)";
        stalk.strokeWidth = 6;
        stalk.drawsOccludedSegments = true;
        setPath(stalk, [
          { lat: src.lat, lng: src.lng, altitude: 0 },
          { lat: src.lat, lng: src.lng, altitude: src.topAltM * 0.4 }
        ], "coordinates");
        fragment.appendChild(stalk);
      }
    }
  } catch (err: any) {
    return err?.message ?? "Could not create 3D smoke elements.";
  }

  mapEl.querySelectorAll(`[${SMOKE_ATTR}]`).forEach((n) => n.remove());
  mapEl.appendChild(fragment);

  // Frame the plume once per scenario: look downwind so the smoke stretches away.
  if (framedScenario.get(mapEl) !== sc.key && typeof (mapEl as any).flyCameraTo === "function") {
    framedScenario.set(mapEl, sc.key);
    const w = engine.windAtCenter(hour);
    const heading = (Math.atan2(w.u, w.v) / DEG + 360) % 360;
    const c = sc.center;
    (mapEl as any).flyCameraTo({
      endCamera: {
        center: { lat: c.lat, lng: c.lng, altitude: 0 },
        tilt: 62,
        heading,
        range: sc.hazard === "volcano" ? 260_000 : 180_000
      },
      durationMillis: 2500
    });
  }
  return null;
}
