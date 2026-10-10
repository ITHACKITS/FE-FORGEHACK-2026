/**
 * simulation/smokeEngine.ts - Map-agnostic Lagrangian particle model for smoke and ash.
 * Particles are emitted at the sources, carried by the wind at their own altitude,
 * spread by turbulence, settle (ash) and are washed out by rain. Renderers (Leaflet 2D,
 * Google 3D) only read the particle arrays.
 *
 * This is a visual approximation driven by example data, not a dispersion forecast.
 */

import { mulberry32, type SmokeScenario } from "./smokeScenarios";

const M_PER_DEG_LAT = 111_320;
const DEG = Math.PI / 180;
const STEP_H = 0.1;            // integration step while animating: 6 minutes
const JUMP_STEP_H = 0.25;      // coarser step for instant jumps (keeps T+48 responsive)
const SPIN_UP_H = 2;           // the event is already running at T+0
const MAX_AGE_H = 50;
const EMIT_PER_HOUR = 170;     // particles per forecast hour across all sources
const CAPACITY = Math.ceil((48 + SPIN_UP_H) * EMIT_PER_HOUR * 1.1);
const K_HORIZONTAL = 1500;     // eddy diffusivity, m^2/s

export class SmokeEngine {
  readonly scenario: SmokeScenario;
  /** Forecast hour the particle state corresponds to. */
  time = -SPIN_UP_H;
  count = 0;

  readonly lat = new Float64Array(CAPACITY);
  readonly lng = new Float64Array(CAPACITY);
  readonly alt = new Float32Array(CAPACITY);
  readonly age = new Float32Array(CAPACITY);
  /** Per-particle random value in [0, 1), used by renderers for variation. */
  readonly seed = new Float32Array(CAPACITY);
  /** Last wind velocity felt by each particle (m/s), for flow-style rendering. */
  readonly vu = new Float32Array(CAPACITY);
  readonly vv = new Float32Array(CAPACITY);
  private readonly settle = new Float32Array(CAPACITY);

  private rnd: () => number;
  private emitCarry = 0;
  private readonly cumulativeWeights: number[];
  private readonly totalWeight: number;

  constructor(scenario: SmokeScenario) {
    this.scenario = scenario;
    this.rnd = mulberry32(1);
    let acc = 0;
    this.cumulativeWeights = scenario.sources.map((s) => (acc += s.weight));
    this.totalWeight = acc;
    this.reset();
  }

  reset() {
    this.rnd = mulberry32(0x5eed);
    this.time = -SPIN_UP_H;
    this.count = 0;
    this.emitCarry = 0;
  }

  /** Jump straight to a forecast hour (replays from the start when going backwards). */
  advanceTo(target: number) {
    if (target < this.time - 1e-6) this.reset();
    while (this.time < target - 1e-6) this.step(Math.min(JUMP_STEP_H, target - this.time));
  }

  /**
   * Move smoothly toward the target hour for animation. Small forward gaps are
   * animated; large or backward jumps are applied instantly.
   * Returns true while still catching up.
   */
  chase(target: number, realDtSec: number): boolean {
    const gap = target - this.time;
    if (gap < -1e-6 || gap > 6) {
      this.advanceTo(target);
      return false;
    }
    if (gap <= 1e-6) return false;
    // Cover one forecast hour in roughly a third of a second, faster for bigger gaps.
    const dt = Math.min(gap, Math.max(3 * realDtSec, gap * realDtSec * 5));
    let left = dt;
    while (left > 1e-6) {
      const h = Math.min(STEP_H, left);
      this.step(h);
      left -= h;
    }
    return target - this.time > 1e-6;
  }

  /** Wind at the scenario's reference point, near the main plume altitude. */
  windAtCenter(hour: number) {
    const s = this.scenario;
    const refAlt = s.hazard === "volcano" ? s.sources[0].topAltM * 0.85 : 800;
    return s.wind(s.center.lat, s.center.lng, hour, refAlt);
  }

  /**
   * Bounding box of the bulk of the plume (5th-95th percentile, plus the sources),
   * as [[south, west], [north, east]] for map framing.
   */
  extent(): [[number, number], [number, number]] {
    const lats: number[] = this.scenario.sources.map((s) => s.lat);
    const lngs: number[] = this.scenario.sources.map((s) => s.lng);
    const pLat: number[] = [];
    const pLng: number[] = [];
    for (let i = 0; i < this.count; i++) {
      pLat.push(this.lat[i]);
      pLng.push(this.lng[i]);
    }
    pLat.sort((a, b) => a - b);
    pLng.sort((a, b) => a - b);
    if (pLat.length > 0) {
      const lo = Math.floor(pLat.length * 0.05);
      const hi = Math.floor(pLat.length * 0.95);
      lats.push(pLat[lo], pLat[hi]);
      lngs.push(pLng[lo], pLng[hi]);
    }
    return [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]];
  }

  private pickSource() {
    const r = this.rnd() * this.totalWeight;
    const w = this.cumulativeWeights;
    let i = 0;
    while (i < w.length - 1 && w[i] < r) i++;
    return this.scenario.sources[i];
  }

  private emit(n: number) {
    const isAsh = this.scenario.hazard === "volcano";
    for (let k = 0; k < n && this.count < CAPACITY; k++) {
      const src = this.pickSource();
      const i = this.count++;
      const span = src.topAltM - src.baseAltM;
      // Volcano: most mass spreads in the umbrella cloud near the top of the column.
      // Fire: smoke concentrates in the lower part of the injection layer.
      const f = isAsh
        ? (this.rnd() < 0.7 ? 0.65 + 0.35 * this.rnd() : this.rnd())
        : Math.pow(this.rnd(), 1.5);
      this.lat[i] = src.lat + (this.rnd() - 0.5) * 0.01;
      this.lng[i] = src.lng + (this.rnd() - 0.5) * 0.01;
      this.alt[i] = src.baseAltM + span * f;
      this.age[i] = 0;
      this.seed[i] = this.rnd();
      this.vu[i] = 0;
      this.vv[i] = 0;
      // Fine ash dominates; a few coarse particles fall out quickly.
      this.settle[i] = isAsh ? 0.01 + 0.2 * Math.pow(this.rnd(), 4) : 0;
    }
  }

  private remove(i: number) {
    const last = --this.count;
    if (i === last) return;
    this.lat[i] = this.lat[last];
    this.lng[i] = this.lng[last];
    this.alt[i] = this.alt[last];
    this.age[i] = this.age[last];
    this.seed[i] = this.seed[last];
    this.vu[i] = this.vu[last];
    this.vv[i] = this.vv[last];
    this.settle[i] = this.settle[last];
  }

  /** Approximately standard-normal noise (sum of three uniforms). */
  private gauss() {
    return (this.rnd() + this.rnd() + this.rnd() - 1.5) * 2;
  }

  private step(dtH: number) {
    const s = this.scenario;
    const dtS = dtH * 3600;
    const hour = this.time;
    const sigmaH = Math.sqrt(2 * K_HORIZONTAL * dtS);
    const sigmaZ = 130 * Math.sqrt(dtH);
    const rain = s.rainAt(hour);
    const washout = rain > 0 ? 1 - Math.exp(-0.05 * Math.pow(rain, 0.7) * dtH) : 0;
    const isAsh = s.hazard === "volcano";

    for (let i = this.count - 1; i >= 0; i--) {
      const age = this.age[i] + dtH;
      if (age > MAX_AGE_H || (washout > 0 && this.rnd() < washout)) {
        this.remove(i);
        continue;
      }
      const lat = this.lat[i];
      const w = s.wind(lat, this.lng[i], hour, this.alt[i]);
      this.vu[i] = w.u;
      this.vv[i] = w.v;
      const dx = w.u * dtS + this.gauss() * sigmaH;
      const dy = w.v * dtS + this.gauss() * sigmaH;
      this.lat[i] = lat + dy / M_PER_DEG_LAT;
      this.lng[i] += dx / (M_PER_DEG_LAT * Math.cos(lat * DEG));
      let alt = this.alt[i] - this.settle[i] * dtS + this.gauss() * sigmaZ;
      if (isAsh) {
        if (alt < 50) {
          this.remove(i); // deposited on the ground
          continue;
        }
      } else if (alt < 50) {
        alt = 50 + this.rnd() * 50; // smoke stays in the boundary layer
      }
      this.alt[i] = alt;
      this.age[i] = age;
    }

    this.emitCarry += EMIT_PER_HOUR * dtH;
    const n = Math.floor(this.emitCarry);
    this.emitCarry -= n;
    this.emit(n);
    this.time += dtH;
  }
}
