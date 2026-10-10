/**
 * simulation/smokeLeafletLayer.ts - Draws SmokeEngine particles as soft puffs on a
 * canvas above the Leaflet tiles (below markers, so icons stay clickable).
 * Each puff drifts a short way along its wind and fades, so the smoke looks like it
 * is flowing even while the timeline is paused.
 */

import type L from "leaflet";
import type { SmokeEngine } from "./smokeEngine";
import { SmokeExposureRenderer } from "./smokeExposureRenderer";

/** "puffs": soft grey smoke for satellite imagery; "exposure": landing-style density grid. */
export type SmokeStyle = "puffs" | "exposure";

const EARTH_CIRCUMFERENCE_M = 40_075_016.686;
const DEG = Math.PI / 180;
const FLOW_SECONDS = 1500;      // how far (in wind-seconds) a puff drifts per flow cycle
const FLOW_PERIOD_MS = 2600;    // real time for one flow cycle
const SPRITE_PX = 64;

type RGB = [number, number, number];

// Young puffs are darker and denser; older puffs are lighter and thinner.
const PALETTES: Record<"volcano" | "fire", RGB[]> = {
  volcano: [[112, 102, 94], [146, 138, 130], [176, 168, 160], [202, 196, 190]],
  fire: [[150, 134, 118], [182, 170, 156], [204, 196, 186], [222, 216, 208]]
};

function makeSprite([r, g, b]: RGB): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = SPRITE_PX;
  const ctx = c.getContext("2d")!;
  const h = SPRITE_PX / 2;
  const grad = ctx.createRadialGradient(h, h, 0, h, h, h);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.45, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SPRITE_PX, SPRITE_PX);
  return c;
}

export class SmokeLeafletLayer {
  private readonly map: L.Map;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites: Record<"volcano" | "fire", HTMLCanvasElement[]>;
  private readonly reducedMotion: boolean;
  private readonly exposure = new SmokeExposureRenderer();
  private engine: SmokeEngine | null = null;
  private style: SmokeStyle = "puffs";
  private dpr = 1;
  private target = 0;
  private visible = true;
  private zooming = false;
  private raf = 0;
  private lastFrame = 0;

  constructor(map: L.Map) {
    this.map = map;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "smoke-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      zIndex: "450", // above overlay pane (400), below markers (600)
      pointerEvents: "none",
      transition: "opacity .2s"
    });
    map.getContainer().appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.sprites = {
      volcano: PALETTES.volcano.map(makeSprite),
      fire: PALETTES.fire.map(makeSprite)
    };

    map.on("resize", this.resize);
    map.on("zoomstart", this.onZoomStart);
    map.on("zoomend", this.onZoomEnd);
    map.on("move", this.requestDraw);
    this.resize();
  }

  setEngine(engine: SmokeEngine | null) {
    this.engine = engine;
    this.sync();
  }

  setTargetHour(hour: number) {
    this.target = hour;
    this.sync();
  }

  setStyle(style: SmokeStyle) {
    this.style = style;
    this.sync();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    this.canvas.style.display = visible ? "block" : "none";
    this.sync();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.map.off("resize", this.resize);
    this.map.off("zoomstart", this.onZoomStart);
    this.map.off("zoomend", this.onZoomEnd);
    this.map.off("move", this.requestDraw);
    this.canvas.remove();
  }

  private sync() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (!this.visible || !this.engine) {
      this.clear();
      return;
    }
    if (this.reducedMotion) {
      this.engine.advanceTo(this.target);
      this.draw(0);
    } else {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    }
  }

  private loop = (now: number) => {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (this.engine) {
      this.engine.chase(this.target, dt);
      this.draw(now);
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  /** Static redraw for reduced motion; the animated loop redraws every frame anyway. */
  private requestDraw = () => {
    if (this.reducedMotion && this.visible) this.draw(0);
  };

  private onZoomStart = () => {
    this.zooming = true;
    this.canvas.style.opacity = "0";
  };

  private onZoomEnd = () => {
    this.zooming = false;
    this.canvas.style.opacity = "1";
    this.requestDraw();
  };

  private resize = () => {
    const size = this.map.getSize();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.canvas.width = Math.round(size.x * dpr);
    this.canvas.height = Math.round(size.y * dpr);
    this.canvas.style.width = `${size.x}px`;
    this.canvas.style.height = `${size.y}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.requestDraw();
  };

  private clear() {
    const size = this.map.getSize();
    this.ctx.clearRect(0, 0, size.x, size.y);
  }

  private draw(now: number) {
    const engine = this.engine;
    if (!engine || this.zooming) return;
    const ctx = this.ctx;
    const map = this.map;
    const size = map.getSize();
    ctx.clearRect(0, 0, size.x, size.y);

    // Inline spherical-mercator projection (what Leaflet's EPSG:3857 does) so thousands
    // of particles per frame don't allocate LatLng/Point objects.
    const zoom = map.getZoom();
    const scale = 256 * Math.pow(2, zoom);
    const origin = map.getPixelOrigin();
    const pane = map.containerPointToLayerPoint([0, 0]);
    const offX = -origin.x - pane.x;
    const offY = -origin.y - pane.y;
    const mppEquator = EARTH_CIRCUMFERENCE_M / scale;

    if (this.style === "exposure") {
      this.exposure.draw(
        ctx,
        engine,
        { scale, offX, offY, width: size.x, height: size.y, dpr: this.dpr },
        now,
        !this.reducedMotion
      );
      return;
    }

    const hazard = engine.scenario.hazard;
    const sprites = this.sprites[hazard];
    const animate = !this.reducedMotion;
    const cycle = animate ? now / FLOW_PERIOD_MS : 0;
    const isAsh = hazard === "volcano";
    const margin = 100;

    // Example fire sources: a small glow under the smoke so the plume's origin is visible.
    if (hazard === "fire") {
      const pulse = animate ? 0.6 + 0.2 * Math.sin(now / 400) : 0.7;
      for (const s of engine.scenario.sources) {
        const sinLat = Math.sin(s.lat * DEG);
        const x = (scale * (s.lng + 180)) / 360 + offX;
        const y = scale * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) + offY;
        const r = 3 + Math.min(4, Math.sqrt(s.weight) * 0.4);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
        g.addColorStop(0, "rgba(255,214,120,1)");
        g.addColorStop(0.35, "rgba(255,120,40,0.75)");
        g.addColorStop(1, "rgba(255,80,20,0)");
        ctx.globalAlpha = pulse;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < engine.count; i++) {
      const lat = engine.lat[i];
      const cosLat = Math.cos(lat * DEG);
      const mpp = mppEquator * cosLat;
      const age = engine.age[i];

      // Flow offset: drift along the particle's wind, then restart (phase is staggered).
      let phase = 0.5;
      let lng = engine.lng[i];
      let la = lat;
      if (animate) {
        phase = (cycle + engine.seed[i]) % 1;
        const drift = FLOW_SECONDS * (phase - 0.5);
        la += (engine.vv[i] * drift) / 111_320;
        lng += (engine.vu[i] * drift) / (111_320 * cosLat);
      }

      const x = (scale * (lng + 180)) / 360 + offX;
      const sinLat = Math.sin(la * DEG);
      const y = scale * (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) + offY;
      if (x < -margin || y < -margin || x > size.x + margin || y > size.y + margin) continue;

      const radiusM = (isAsh ? 1500 : 900) + (isAsh ? 3800 : 2600) * Math.sqrt(age);
      const r = Math.min(90, Math.max(1.5, radiusM / mpp));
      let alpha = 0.62 * Math.pow(Math.min(1, 1500 / radiusM), 0.42);
      alpha *= Math.min(1, age / 0.25);            // fade in at the source
      if (age > 44) alpha *= Math.max(0, (50 - age) / 6); // fade out at end of life
      if (animate) alpha *= 0.55 + 0.45 * Math.sin(Math.PI * phase);
      if (alpha < 0.03) continue;

      const bin = age < 2 ? 0 : age < 8 ? 1 : age < 20 ? 2 : 3;
      ctx.globalAlpha = Math.min(0.85, alpha);
      ctx.drawImage(sprites[bin], x - r, y - r, r * 2, r * 2);
    }

    ctx.globalAlpha = 1;
  }
}
