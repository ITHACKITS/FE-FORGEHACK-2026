/**
 * components/layout/NationalModes.tsx - Nationwide map modes for all of Indonesia:
 * "Wind & smoke" (forecast wind field plus smoke/ash paths) and "Heatmap" (fire detections).
 * Data: /layers/wind, /layers/smoke-paths, /layers/heatmap. Failures show a visible chip.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Wind, Flame, CircleOff, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import type { HeatmapResponse, SmokePathsResponse, WindFieldResponse } from "../../types/api";
import { WindLeafletLayer, WIND_SPEED_BINS } from "../../simulation/windLayer";
import { HeatLeafletLayer, HEAT_STOPS } from "../../simulation/heatLayer";

export type NationalMode = "off" | "wind" | "heat";
type Level = "10m" | "850hPa";

interface NationalModesProps {
  map: L.Map | null;
  lang: "id" | "en";
  onModeChange?: (mode: NationalMode) => void;
}

const FORECAST_HOURS = 384; // 16 days
const SKILL_DAYS = 7;
const PATH_COLORS = { fire: "#f97316", volcano: "#c4b5fd" } as const;

function formatWib(iso: string, lang: "id" | "en"): string {
  const d = new Date(iso);
  const s = d.toLocaleString(lang === "id" ? "id-ID" : "en-GB", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
  return `${s} WIB`;
}

/** Tooltip content as a DOM node: names come from the API, so they are text, not HTML. */
function textNode(text: string): HTMLElement {
  const el = document.createElement("span");
  el.textContent = text;
  return el;
}

export const NationalModes: React.FC<NationalModesProps> = ({ map, lang, onModeChange }) => {
  const id = lang === "id";
  const [mode, setMode] = useState<NationalMode>("off");
  const [level, setLevel] = useState<Level>("10m");
  const [wind, setWind] = useState<WindFieldResponse | null>(null);
  const [paths, setPaths] = useState<SmokePathsResponse | null>(null);
  const [heat, setHeat] = useState<HeatmapResponse | null>(null);
  const [timeIdx, setTimeIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const windLayerRef = useRef<WindLeafletLayer | null>(null);
  const heatLayerRef = useRef<HeatLeafletLayer | null>(null);
  const pathsGroupRef = useRef<L.LayerGroup | null>(null);

  // Canvas layers live as long as the map.
  useEffect(() => {
    if (!map) return;
    windLayerRef.current = new WindLeafletLayer(map);
    heatLayerRef.current = new HeatLeafletLayer(map);
    pathsGroupRef.current = L.layerGroup();
    return () => {
      windLayerRef.current?.destroy();
      heatLayerRef.current?.destroy();
      pathsGroupRef.current?.remove();
      windLayerRef.current = heatLayerRef.current = null;
      pathsGroupRef.current = null;
    };
  }, [map]);

  // Loading state is set by the event that starts a fetch, not inside the fetch effect.
  const startLoading = () => {
    setLoading(true);
    setError(null);
  };

  const changeMode = useCallback((next: NationalMode) => {
    setMode(next);
    setError(null);
    setLoading(next !== "off");
    onModeChange?.(next);
  }, [onModeChange]);

  // Fetch data for the active mode.
  useEffect(() => {
    if (mode === "off") return;
    let cancelled = false;
    const job = mode === "wind"
      ? Promise.all([api.getWind(level, FORECAST_HOURS), api.getSmokePaths(72)]).then(([w, p]) => {
          if (cancelled) return;
          if (!w.available) throw new Error(w.reason || "wind unavailable");
          setWind(w);
          setPaths(p.available ? p : null);
          setTimeIdx(0);
        })
      : api.getHeatmap(7).then((h) => {
          if (cancelled) return;
          if (!h.available) throw new Error(h.reason || "heatmap unavailable");
          setHeat(h);
        });
    job
      .catch((err: Error) => { if (!cancelled) setError(err.message || "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode, level, reload]);

  // Wind layer and smoke paths.
  useEffect(() => {
    const layer = windLayerRef.current;
    const group = pathsGroupRef.current;
    if (!map || !layer || !group) return;
    const on = mode === "wind" && !!wind?.grid && !error;
    layer.setField(on ? { grid: wind!.grid!, u: wind!.u!, v: wind!.v! } : null);
    layer.setVisible(on);

    group.clearLayers();
    if (on && paths) {
      const every = paths.marks_every_h ?? 24;
      for (const p of paths.paths) {
        const color = PATH_COLORS[p.source_type];
        L.polyline(p.coords, { color, weight: 2.2, opacity: 0.9, dashArray: "6 6", interactive: false }).addTo(group);
        L.circleMarker(p.coords[0], { radius: 4, color: "#0f172a", weight: 1, fillColor: color, fillOpacity: 1 })
          .bindTooltip(textNode(p.name), { direction: "top" })
          .addTo(group);
        for (let h = every; h < p.coords.length; h += every) {
          L.circleMarker(p.coords[h], { radius: 3, color, weight: 1.5, fillColor: "#0f172a", fillOpacity: 0.9 })
            .bindTooltip(textNode(`${p.name} · +${h} h`), { direction: "top" })
            .addTo(group);
        }
      }
      group.addTo(map);
    } else {
      group.remove();
    }
  }, [map, mode, wind, paths, error]);

  useEffect(() => {
    windLayerRef.current?.setTime(timeIdx);
  }, [timeIdx]);

  // Heat layer.
  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer) return;
    const on = mode === "heat" && !!heat && !error;
    if (on) layer.setData(heat!.cells, heat!.max_frp_sum ?? 1, heat!.cell_deg ?? 0.25);
    layer.setVisible(on);
  }, [mode, heat, error]);

  const times = wind?.times ?? [];
  const stepH = wind?.step_hours ?? 3;
  const leadH = timeIdx * stepH;
  const indicative = leadH > SKILL_DAYS * 24;
  const fromSnapshot = wind?.origin === "snapshot" || wind?.stale;

  const modes: [NationalMode, React.ElementType, string][] = [
    ["off", CircleOff, id ? "Mati" : "Off"],
    ["wind", Wind, id ? "Angin & asap" : "Wind & smoke"],
    ["heat", Flame, id ? "Heatmap api" : "Fire heatmap"]
  ];

  return (
    <div className="flex flex-col items-end gap-2 max-w-[min(360px,calc(100vw-1rem))]">
      {mode !== "off" && (
        <section
          className="w-full rounded-2xl p-3 aurora-glass-card border border-white/20 shadow-2xl text-slate-100 text-[11px] leading-snug"
          aria-label={id ? "Mode peta nasional" : "National map mode"}
        >
          {loading && <p role="status">{id ? "Memuat data…" : "Loading data…"}</p>}

          {error && (
            <div role="alert" className="flex items-center gap-2 text-amber-200">
              <span className="font-bold uppercase tracking-wide text-[9px] px-1.5 py-0.5 rounded border border-amber-300/60">
                {id ? "Data tidak tersedia" : "Data unavailable"}
              </span>
              <button
                type="button"
                onClick={() => { startLoading(); setReload((n) => n + 1); }}
                className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" /> {id ? "Coba lagi" : "Retry"}
              </button>
            </div>
          )}

          {!loading && !error && mode === "wind" && wind && times.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-white">{id ? "Angin seluruh Indonesia" : "Wind across Indonesia"}</strong>
                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${indicative ? "border-amber-300/60 text-amber-200" : "border-emerald-300/60 text-emerald-200"}`}>
                  {indicative ? (id ? "Indikatif (hari 8–16)" : "Indicative (day 8–16)") : (id ? "Prakiraan" : "Forecast")}
                </span>
              </div>

              <fieldset className="flex rounded-full p-0.5 bg-black/30 border border-white/10 self-start">
                <legend className="sr-only">{id ? "Ketinggian angin" : "Wind level"}</legend>
                {([["10m", id ? "Asap · 10 m" : "Smoke · 10 m"], ["850hPa", id ? "Abu · 1,5 km" : "Ash · 1.5 km"]] as const).map(([value, label]) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" name="wind-level" value={value} checked={level === value} onChange={() => { startLoading(); setLevel(value); }} className="sr-only peer" />
                    <span className="block px-2.5 py-1 rounded-full text-[10.5px] font-bold text-slate-300 peer-checked:bg-sky-500/40 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-300">
                      {label}
                    </span>
                  </label>
                ))}
              </fieldset>

              <label className="flex flex-col gap-1">
                <span className="flex justify-between gap-2 font-mono text-[10.5px]">
                  <span>{formatWib(times[timeIdx], lang)}</span>
                  <span className="text-slate-400">+{leadH} h</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={times.length - 1}
                  step={1}
                  value={timeIdx}
                  onChange={(e) => setTimeIdx(Number(e.target.value))}
                  aria-valuetext={`${formatWib(times[timeIdx], lang)}, +${leadH} h`}
                  className="w-full accent-sky-400"
                />
              </label>

              <div className="flex items-center gap-1 flex-wrap" aria-label={id ? "Legenda kecepatan angin (m/s)" : "Wind speed legend (m/s)"}>
                {WIND_SPEED_BINS.map((b) => (
                  <span key={b.label} className="flex items-center gap-1 font-mono text-[10px]">
                    <i className="inline-block w-3 h-1.5 rounded-sm" style={{ background: b.color }} />
                    {b.label}
                  </span>
                ))}
                <span className="text-slate-400 text-[10px]">m/s</span>
              </div>

              {paths && (
                <p className="flex items-center gap-3 text-[10.5px]">
                  <span className="flex items-center gap-1"><i className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: PATH_COLORS.fire }} />{id ? "Asap kebakaran" : "Fire smoke"}</span>
                  <span className="flex items-center gap-1"><i className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: PATH_COLORS.volcano }} />{id ? "Abu gunung api" : "Volcanic ash"}</span>
                  <span className="text-slate-400">● +24/48/72 h</span>
                </p>
              )}

              <p className="text-slate-300">
                {id
                  ? "Garis putus-putus: arah gerak pusat asap/abu 72 jam ke depan dari titik api terkuat dan gunung api Level II+. Estimasi model, bukan peringatan resmi."
                  : "Dashed lines: where the centre of smoke/ash drifts over the next 72 h from the strongest fire clusters and Level II+ volcanoes. Model estimate, not an official warning."}
              </p>
              <p className="text-slate-400 text-[10px]">
                Open-Meteo · {id ? "diambil" : "fetched"} {wind.fetched_at ? formatWib(wind.fetched_at, lang) : "-"}
                {fromSnapshot && (id ? " · snapshot tersimpan" : " · stored snapshot")}
                {paths?.fires_as_of && ` · ${id ? "titik api per" : "fires as of"} ${paths.fires_as_of}`}
              </p>
            </div>
          )}

          {!loading && !error && mode === "heat" && heat && (
            <div className="flex flex-col gap-2">
              <strong className="text-white">{id ? "Heatmap titik api seluruh Indonesia" : "Fire heatmap across Indonesia"}</strong>
              <div aria-label={id ? "Legenda intensitas api" : "Fire intensity legend"}>
                <div className="h-2 rounded-full" style={{ background: `linear-gradient(to right, ${HEAT_STOPS.map(([s, c]) => `${c} ${s * 100}%`).join(", ")})` }} />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>{id ? "Rendah" : "Low"}</span>
                  <span>{id ? "Daya radiasi api (FRP) tinggi" : "High fire radiative power (FRP)"}</span>
                </div>
              </div>
              <p className="text-slate-300">
                {heat.cells.length} {id ? "sel 0,25° dengan deteksi" : "0.25° cells with detections"}, {heat.window_start} – {heat.as_of}.
              </p>
              <p className="text-slate-400 text-[10px]">NASA FIRMS · {id ? "data per" : "data as of"} {heat.as_of}</p>
            </div>
          )}
        </section>
      )}

      <fieldset className="flex rounded-full p-0.5 aurora-glass-card border border-white/20 shadow-2xl">
        <legend className="sr-only">{id ? "Mode peta nasional" : "National map mode"}</legend>
        {modes.map(([value, Icon, label]) => (
          <label key={value} className="cursor-pointer" title={label}>
            <input type="radio" name="national-mode" value={value} checked={mode === value} onChange={() => changeMode(value)} className="sr-only peer" />
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-300 hover:bg-white/10 peer-checked:bg-emerald-500/40 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-300">
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className={value === "off" ? "sr-only sm:not-sr-only" : ""}>{label}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
};

export default NationalModes;
