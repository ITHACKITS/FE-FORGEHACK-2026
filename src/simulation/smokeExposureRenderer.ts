/**
 * simulation/smokeExposureRenderer.ts - "Exposure map" style for SmokeEngine output,
 * matching the illustrated map on the landing page (public/js/sim.js): a blocky grid in
 * three smoke-density tiers, dark flowing particles and an ink-outlined source symbol.
 *
 * Tiers are relative particle density from one example run, not ensemble probability
 * and not a PM2.5 concentration.
 */

import type { SmokeEngine } from "./smokeEngine";

export interface ExposureView {
  /** World size in CSS pixels at the current zoom (256 * 2^zoom). */
  scale: number;
  /** Add to world-pixel coordinates to get container coordinates. */
  offX: number;
  offY: number;
  width: number;
  height: number;
  /** Device pixel ratio the target canvas is scaled by. */
  dpr: number;
}

const DEG = Math.PI / 180;
const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const CELL_PX = 10;
const MIN_CELL_M = 2000;       // keeps cells from going speckled at high zoom
const MAX_DOTS = 700;           // a sparse sprinkle, like the landing map's live particles
const FLOW_SECONDS = 1500;
const FLOW_PERIOD_MS = 2600;

// Weighted particles per km^2 (weight = exp(-age/36)), tuned on the example scenarios.
const TIER_THRESHOLDS = [0.008, 0.05, 0.13];
// Same hues as the landing page's ensemble map. The grid is rasterised opaque and composited
// once at GRID_ALPHA, so overlapping cells don't leave darker seams.
export const EXPOSURE_TIER_COLORS = ["rgb(231,181,102)", "rgb(201,88,74)", "rgb(147,64,58)"];
const GRID_ALPHA = 0.74;
const INK = "#16302A";

function mercY(lat: number, scale: number) {
  const s = Math.sin(lat * DEG);
  return scale * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI));
}

export class SmokeExposureRenderer {
  private readonly cache = document.createElement("canvas");
  private readonly cacheCtx = this.cache.getContext("2d")!;
  private cacheKey = "";

  draw(ctx: CanvasRenderingContext2D, engine: SmokeEngine, view: ExposureView, now: number, animate: boolean) {
    this.drawGrid(engine, view);
    ctx.globalAlpha = GRID_ALPHA;
    ctx.drawImage(this.cache, 0, 0, view.width, view.height);
    ctx.globalAlpha = 1;
    this.drawParticles(ctx, engine, view, now, animate);
    this.drawSource(ctx, engine, view);
  }

  /** Density grid, re-rasterised only when the plume or the view changes. */
  private drawGrid(engine: SmokeEngine, view: ExposureView) {
    const { scale, offX, offY, width, height, dpr } = view;
    const key = `${engine.scenario.key}|${engine.time.toFixed(3)}|${scale}|${offX.toFixed(1)}|${offY.toFixed(1)}|${width}x${height}@${dpr}`;
    if (key === this.cacheKey) return;
    this.cacheKey = key;

    const c = this.cache;
    const ctx = this.cacheCtx;
    if (c.width !== Math.round(width * dpr) || c.height !== Math.round(height * dpr)) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (engine.count === 0) return;

    // Cell size in screen pixels, snapped to the world-pixel grid so panning is stable.
    const lat0 = engine.scenario.center.lat;
    const mppCenter = (EARTH_CIRCUMFERENCE_M / scale) * Math.cos(lat0 * DEG);
    const cellPx = Math.max(CELL_PX, Math.ceil(MIN_CELL_M / mppCenter));
    const KEY = 1e7;

    const sums = new Map<number, number>();
    for (let i = 0; i < engine.count; i++) {
      const lat = engine.lat[i];
      const ix = Math.floor((scale * (engine.lng[i] + 180)) / 360 / cellPx);
      const iy = Math.floor(mercY(lat, scale) / cellPx);
      const cellKm = (cellPx * (EARTH_CIRCUMFERENCE_M / scale) * Math.cos(lat * DEG)) / 1000;
      const k = ix * KEY + iy;
      sums.set(k, (sums.get(k) ?? 0) + Math.exp(-engine.age[i] / 36) / (cellKm * cellKm));
    }

    // 3x3 box blur over the occupied neighbourhood, then bucket into tiers.
    const tiers: number[][] = [[], [], []];
    const seen = new Set<number>();
    for (const k of sums.keys()) {
      const ix = Math.floor(k / KEY);
      const iy = k - ix * KEY;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nk = (ix + dx) * KEY + (iy + dy);
          if (seen.has(nk)) continue;
          seen.add(nk);
          let s = 0;
          for (let ex = -1; ex <= 1; ex++) {
            for (let ey = -1; ey <= 1; ey++) s += sums.get((ix + dx + ex) * KEY + (iy + dy + ey)) ?? 0;
          }
          const d = s / 9;
          const t = d >= TIER_THRESHOLDS[2] ? 2 : d >= TIER_THRESHOLDS[1] ? 1 : d >= TIER_THRESHOLDS[0] ? 0 : -1;
          if (t >= 0) tiers[t].push(nk);
        }
      }
    }

    tiers.forEach((cells, t) => {
      ctx.fillStyle = EXPOSURE_TIER_COLORS[t];
      for (const k of cells) {
        const ix = Math.floor(k / KEY);
        const iy = k - ix * KEY;
        const x = ix * cellPx + offX;
        const y = iy * cellPx + offY;
        if (x > width || y > height || x + cellPx < 0 || y + cellPx < 0) continue;
        // Slight overlap hides hairline seams between neighbouring cells.
        ctx.fillRect(x - 0.4, y - 0.4, cellPx + 0.8, cellPx + 0.8);
      }
    });
  }

  private drawParticles(ctx: CanvasRenderingContext2D, engine: SmokeEngine, view: ExposureView, now: number, animate: boolean) {
    const { scale, offX, offY, width, height } = view;
    const stride = Math.max(1, Math.ceil(engine.count / MAX_DOTS));
    const cycle = animate ? now / FLOW_PERIOD_MS : 0;
    for (let i = 0; i < engine.count; i += stride) {
      const age = engine.age[i];
      const al = Math.max(0, 1 - age / 30);
      let lat = engine.lat[i];
      let lng = engine.lng[i];
      let fade = 1;
      if (animate) {
        const phase = (cycle + engine.seed[i]) % 1;
        const drift = FLOW_SECONDS * (phase - 0.5);
        const cosLat = Math.cos(lat * DEG);
        lat += (engine.vv[i] * drift) / 111_320;
        lng += (engine.vu[i] * drift) / (111_320 * cosLat);
        fade = 0.4 + 0.6 * Math.sin(Math.PI * phase);
      }
      const x = (scale * (lng + 180)) / 360 + offX;
      const y = mercY(lat, scale) + offY;
      if (x < -4 || y < -4 || x > width + 4 || y > height + 4) continue;
      ctx.fillStyle = `rgba(38,29,25,${((0.15 + 0.6 * al) * fade).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + 1.1 * al, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSource(ctx: CanvasRenderingContext2D, engine: SmokeEngine, view: ExposureView) {
    const { scale, offX, offY } = view;
    const sc = engine.scenario;
    ctx.lineJoin = "round";
    if (sc.hazard === "volcano") {
      const s = sc.sources[0];
      const x = (scale * (s.lng + 180)) / 360 + offX;
      const y = mercY(s.lat, scale) + offY;
      const t = 13;
      ctx.beginPath();
      ctx.moveTo(x, y - t);
      ctx.lineTo(x + t * 0.9, y + t * 0.7);
      ctx.lineTo(x - t * 0.9, y + t * 0.7);
      ctx.closePath();
      ctx.fillStyle = "#E0612B";
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      return;
    }
    for (const s of sc.sources) {
      const x = (scale * (s.lng + 180)) / 360 + offX;
      const y = mercY(s.lat, scale) + offY;
      const r = 3 + Math.min(3, Math.sqrt(s.weight) * 0.3);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "#D4501C";
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  }
}
