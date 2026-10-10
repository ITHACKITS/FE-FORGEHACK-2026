/**
 * components/layout/NationalModes.tsx - One nationwide map panel with three time frames:
 * "History" (fire heatmap over the last 7 days of detections), "Now" (the latest day of
 * detections plus the current wind) and "Forecast" (16-day wind with 72 h smoke/ash paths).
 * Smoke (wind) and the heatmap are layers of the same panel, not separate modes.
 * Data: /layers/heatmap, /layers/wind, /layers/smoke-paths. Failures show a visible chip.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { History, Radio, TrendingUp, CircleOff, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import type { HeatmapResponse, SmokePathsResponse, WindFieldResponse } from "../../types/api";
import { WindLeafletLayer, WIND_SPEED_BINS } from "../../simulation/windLayer";
import { HeatLeafletLayer, HEAT_STOPS } from "../../simulation/heatLayer";
import { pathName } from "../../utils/apiLabels";

export type NationalMode = "off" | "history" | "now" | "forecast";
type Level = "10m" | "850hPa";

interface NationalModesProps {
  map: L.Map | null;
  lang: "id" | "en";
  onModeChange?: (mode: NationalMode) => void;
}

const FORECAST_HOURS = 384; // 16 days
const NOW_WIND_HOURS = 24;
const HISTORY_DAYS = 7; // the most the API serves
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

function sumDetections(heat: HeatmapResponse | null): number {
  return heat ? heat.cells.reduce((n, c) => n + (c.count || 0), 0) : 0;
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

  // Fetch data for the active time frame.
  useEffect(() => {
    if (mode === "off") return;
    let cancelled = false;
    let job: Promise<void>;
    if (mode === "history") {
      job = api.getHeatmap(HISTORY_DAYS).then((h) => {
        if (cancelled) return;
        if (!h.available) throw new Error(h.reason || "heatmap unavailable");
        setHeat(h);
      });
    } else if (mode === "now") {
      job = Promise.all([api.getWind(level, NOW_WIND_HOURS), api.getHeatmap(1).catch(() => null)]).then(([w, h]) => {
        if (cancelled) return;
        if (!w.available) throw new Error(w.reason || "wind unavailable");
        setWind(w);
        setHeat(h?.available ? h : null);
        setTimeIdx(0);
      });
    } else {
      job = Promise.all([api.getWind(level, FORECAST_HOURS), api.getSmokePaths(72)]).then(([w, p]) => {
        if (cancelled) return;
        if (!w.available) throw new Error(w.reason || "wind unavailable");
        setWind(w);
        setPaths(p.available ? p : null);
        setTimeIdx(0);
      });
    }
    job
      .catch((err: Error) => { if (!cancelled) setError(err.message || "error"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode, level, reload]);

  const windOn = (mode === "now" || mode === "forecast") && !!wind?.grid && !error && !loading;
  const heatOn = (mode === "history" || mode === "now") && !!heat && !error && !loading;

  // Wind layer and, in the forecast, smoke paths.
  useEffect(() => {
    const layer = windLayerRef.current;
    const group = pathsGroupRef.current;
    if (!map || !layer || !group) return;
    layer.setField(windOn ? { grid: wind!.grid!, u: wind!.u!, v: wind!.v! } : null);
    layer.setVisible(windOn);

    group.clearLayers();
    if (windOn && mode === "forecast" && paths) {
      const every = paths.marks_every_h ?? 24;
      for (const p of paths.paths) {
        const color = PATH_COLORS[p.source_type];
        L.polyline(p.coords, { color, weight: 2.2, opacity: 0.9, dashArray: "6 6", interactive: false }).addTo(group);
        L.circleMarker(p.coords[0], { radius: 4, color: "#0f172a", weight: 1, fillColor: color, fillOpacity: 1 })
          .bindTooltip(textNode(pathName(p.name, lang)), { direction: "top" })
          .addTo(group);
        for (let h = every; h < p.coords.length; h += every) {
          L.circleMarker(p.coords[h], { radius: 3, color, weight: 1.5, fillColor: "#0f172a", fillOpacity: 0.9 })
            .bindTooltip(textNode(`${pathName(p.name, lang)} · +${h} ${lang === "id" ? "jam" : "h"}`), { direction: "top" })
            .addTo(group);
        }
      }
      group.addTo(map);
    } else {
      group.remove();
    }
  }, [map, mode, wind, paths, windOn, lang]);

  useEffect(() => {
    windLayerRef.current?.setTime(timeIdx);
  }, [timeIdx]);

  // Heat layer.
  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer) return;
    if (heatOn) layer.setData(heat!.cells, heat!.max_frp_sum ?? 1, heat!.cell_deg ?? 0.25);
    layer.setVisible(heatOn);
  }, [heat, heatOn]);

  const times = wind?.times ?? [];
  const stepH = wind?.step_hours ?? 3;
  const leadH = timeIdx * stepH;
  const indicative = leadH > SKILL_DAYS * 24;
  const fromSnapshot = wind?.origin === "snapshot" || wind?.stale;

  const modes: [NationalMode, React.ElementType, string][] = [
    ["off", CircleOff, id ? "Mati" : "Off"],
    ["history", History, id ? "Histori" : "History"],
    ["now", Radio, id ? "Saat ini" : "Now"],
    ["forecast", TrendingUp, id ? "Prediksi" : "Forecast"]
  ];

  const levelSwitch = (
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
  );

  const windLegend = (
    <div className="flex items-center gap-1 flex-wrap" aria-label={id ? "Legenda kecepatan angin (m/s)" : "Wind speed legend (m/s)"}>
      {WIND_SPEED_BINS.map((b) => (
        <span key={b.label} className="flex items-center gap-1 font-mono text-[10px]">
          <i className="inline-block w-3 h-1.5 rounded-sm" style={{ background: b.color }} />
          {b.label}
        </span>
      ))}
      <span className="text-slate-400 text-[10px]">m/s</span>
    </div>
  );

  const heatLegend = (
    <div aria-label={id ? "Legenda intensitas api" : "Fire intensity legend"}>
      <div className="h-2 rounded-full" style={{ background: `linear-gradient(to right, ${HEAT_STOPS.map(([s, c]) => `${c} ${s * 100}%`).join(", ")})` }} />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>{id ? "Rendah" : "Low"}</span>
        <span>{id ? "Daya radiasi api (FRP) tinggi" : "High fire radiative power (FRP)"}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-end gap-2 max-w-[min(360px,calc(100vw-1rem))]">
      {mode !== "off" && (
        <section
          className="w-full rounded-2xl p-3 aurora-glass-card border border-white/20 shadow-2xl text-slate-100 text-[11px] leading-snug"
          aria-label={id ? "Data seluruh Indonesia" : "Data across Indonesia"}
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

          {!loading && !error && mode === "history" && heat && (
            <div className="flex flex-col gap-2">
              <strong className="text-white">{id ? "Histori titik api, 7 hari terakhir" : "Fire history, last 7 days"}</strong>
              {heatLegend}
              <p className="text-slate-300">
                {sumDetections(heat).toLocaleString(id ? "id-ID" : "en-US")} {id ? "deteksi satelit di" : "satellite detections in"} {heat.cells.length} {id ? "sel 0,25°" : "0.25° cells"}, {heat.window_start} – {heat.as_of}.
              </p>
              <p className="text-slate-400 text-[10px]">NASA FIRMS VIIRS/MODIS · {id ? "data per" : "data as of"} {heat.as_of}</p>
            </div>
          )}

          {!loading && !error && mode === "now" && wind && times.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-white">{id ? "Kondisi saat ini" : "Right now"}</strong>
                <span className="font-mono text-[10.5px] text-slate-300">{formatWib(times[0], lang)}</span>
              </div>
              {levelSwitch}
              {windLegend}
              {heat ? (
                <>
                  {heatLegend}
                  <p className="text-slate-300">
                    {sumDetections(heat).toLocaleString(id ? "id-ID" : "en-US")} {id ? "titik api terdeteksi pada" : "fire detections on"} {heat.as_of}
                    {id ? " (hari deteksi terbaru)" : " (latest detection day)"}.
                  </p>
                </>
              ) : (
                <p className="text-amber-200">{id ? "Data titik api terbaru belum tersedia." : "Latest fire detections are not available."}</p>
              )}
              <p className="text-slate-400 text-[10px]">
                Open-Meteo · NASA FIRMS{heat?.as_of ? ` · ${id ? "titik api per" : "fires as of"} ${heat.as_of}` : ""}
                {fromSnapshot && (id ? " · snapshot tersimpan" : " · stored snapshot")}
              </p>
            </div>
          )}

          {!loading && !error && mode === "forecast" && wind && times.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-white">{id ? "Prediksi angin & asap" : "Wind & smoke forecast"}</strong>
                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${indicative ? "border-amber-300/60 text-amber-200" : "border-emerald-300/60 text-emerald-200"}`}>
                  {indicative ? (id ? "Indikatif (hari 8–16)" : "Indicative (day 8–16)") : (id ? "Prakiraan" : "Forecast")}
                </span>
              </div>

              {levelSwitch}

              <label className="flex flex-col gap-1">
                <span className="flex justify-between gap-2 font-mono text-[10.5px]">
                  <span>{formatWib(times[timeIdx], lang)}</span>
                  <span className="text-slate-400">+{leadH} {id ? "jam" : "h"}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={times.length - 1}
                  step={1}
                  value={timeIdx}
                  onChange={(e) => setTimeIdx(Number(e.target.value))}
                  aria-valuetext={`${formatWib(times[timeIdx], lang)}, +${leadH} ${id ? "jam" : "h"}`}
                  className="w-full accent-sky-400"
                />
              </label>

              {windLegend}

              {paths && (
                <p className="flex items-center gap-3 text-[10.5px]">
                  <span className="flex items-center gap-1"><i className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: PATH_COLORS.fire }} />{id ? "Asap kebakaran" : "Fire smoke"}</span>
                  <span className="flex items-center gap-1"><i className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: PATH_COLORS.volcano }} />{id ? "Abu gunung api" : "Volcanic ash"}</span>
                  <span className="text-slate-400">● +24/48/72 {id ? "jam" : "h"}</span>
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
        </section>
      )}

      <fieldset className="flex rounded-full p-0.5 aurora-glass-card border border-white/20 shadow-2xl">
        <legend className="sr-only">{id ? "Kerangka waktu data" : "Data time frame"}</legend>
        {modes.map(([value, Icon, label]) => (
          <label key={value} className="cursor-pointer" title={label}>
            <input type="radio" name="national-mode" value={value} checked={mode === value} onChange={() => changeMode(value)} className="sr-only peer" />
            <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-300 hover:bg-white/10 peer-checked:bg-emerald-500/40 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-emerald-300">
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
