/**
 * components/layout/AiBrief.tsx - "AI brief" for one place: what is near (fires, smoke and
 * ash forecasts, volcanoes, fire-prone forests) and what a household should do.
 * Data: GET /advice/nearby. The backend computes the facts; the AI service writes the brief
 * with a Featherless LLM (template fallback) and checks nearby detections with its
 * RandomForest scorer. The brief carries the AI badge; the facts are shown as data.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Sparkles, X, LocateFixed, Crosshair, RefreshCw } from "lucide-react";
import { api } from "../../services/api";
import type { AdviceResponse, AdviceScenario } from "../../types/api";
import { forestName, forestRisk, pathName, volcanoLevel, volcanoName } from "../../utils/apiLabels";

interface AiBriefProps {
  map: L.Map | null;
  lang: "id" | "en";
  onOpenChange?: (open: boolean) => void;
}

type Where = "centre" | "gps";

const SCENARIO_STYLE: Record<AdviceScenario, { en: string; id: string; cls: string }> = {
  ash_threat: { en: "Ash threat", id: "Ancaman abu", cls: "bg-rose-500/25 text-rose-200 border-rose-400/50" },
  smoke_threat: { en: "Smoke threat", id: "Ancaman asap", cls: "bg-orange-500/25 text-orange-200 border-orange-400/50" },
  prevention: { en: "Prevention", id: "Pencegahan", cls: "bg-emerald-500/25 text-emerald-200 border-emerald-400/50" },
  clear: { en: "All clear", id: "Aman", cls: "bg-sky-500/25 text-sky-200 border-sky-400/50" }
};

export const AiBrief: React.FC<AiBriefProps> = ({ map, lang, onOpenChange }) => {
  const id = lang === "id";
  const [open, setOpen] = useState(false);
  const [where, setWhere] = useState<Where>("centre");
  const [point, setPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [data, setData] = useState<AdviceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markerRef = useRef<L.CircleMarker | null>(null);
  const reqRef = useRef(0);

  const nf = (n: number | null | undefined, digits = 0) =>
    n === null || n === undefined ? "-" : n.toLocaleString(id ? "id-ID" : "en-US", { maximumFractionDigits: digits });

  const load = useCallback((lat: number, lon: number, w: Where) => {
    const req = ++reqRef.current;
    setWhere(w);
    setPoint({ lat, lon });
    setLoading(true);
    setError(null);
    api.getNearbyAdvice(lat, lon, lang)
      .then((res) => { if (req === reqRef.current) setData(res); })
      .catch((err: Error) => { if (req === reqRef.current) setError(err.message || "error"); })
      .finally(() => { if (req === reqRef.current) setLoading(false); });
  }, [lang]);

  const fromCentre = useCallback(() => {
    if (!map) return;
    const c = map.getCenter();
    const lat = Math.min(7, Math.max(-12, c.lat));
    const lon = Math.min(142, Math.max(94, c.lng));
    load(lat, lon, "centre");
  }, [map, load]);

  const fromGps = () => {
    if (!navigator.geolocation) {
      setError(id ? "Browser tidak mendukung lokasi GPS." : "This browser has no GPS location.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map?.flyTo([latitude, longitude], Math.max(map.getZoom(), 9), { duration: 1 });
        load(latitude, longitude, "gps");
      },
      () => {
        setLoading(false);
        setError(id ? "Izin lokasi ditolak atau lokasi tidak ditemukan." : "Location permission denied or location not found.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    onOpenChange?.(next);
    if (next && !data && !loading) fromCentre();
  };

  // Rewrite the brief in the other language when the UI language changes.
  useEffect(() => {
    if (open && point) load(point.lat, point.lon, where);
    // Only on a language change; load() already depends on lang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // A small marker shows which place the brief describes.
  useEffect(() => {
    markerRef.current?.remove();
    markerRef.current = null;
    if (!map || !open || !point) return;
    markerRef.current = L.circleMarker([point.lat, point.lon], {
      radius: 7, color: "#facc15", weight: 2.5, fillColor: "#facc15", fillOpacity: 0.35, interactive: false
    }).addTo(map);
    return () => { markerRef.current?.remove(); markerRef.current = null; };
  }, [map, open, point]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full aurora-glass-card border border-amber-300/50 shadow-2xl text-[11.5px] font-bold text-white hover:bg-white/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-300 text-slate-900">AI</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
        {id ? "Ringkasan AI untuk area ini" : "AI brief for this area"}
      </button>
    );
  }

  const f = data?.facts;
  const b = data?.brief;
  const sc = data ? SCENARIO_STYLE[data.scenario] : null;
  const volc = f?.volcanoes_nearby?.[0];
  const facts: string[] = [];
  if (f) {
    facts.push(id
      ? `${nf(f.hotspots.within_50km)} titik api dalam 50 km${f.hotspots.nearest_km !== null ? ` (terdekat ${nf(f.hotspots.nearest_km, 1)} km)` : ""}`
      : `${nf(f.hotspots.within_50km)} fire detections within 50 km${f.hotspots.nearest_km !== null ? ` (nearest ${nf(f.hotspots.nearest_km, 1)} km)` : ""}`);
    if (f.smoke_forecast) {
      const s = f.smoke_forecast;
      facts.push(s.hours_from_now === null
        ? (id ? `Sumber asap ${nf(s.closest_km, 1)} km dari sini` : `Smoke source ${nf(s.closest_km, 1)} km from here`)
        : (id ? `Asap melintas ${nf(s.closest_km, 1)} km dari sini dalam ±${s.hours_from_now} jam` : `Smoke passes ${nf(s.closest_km, 1)} km away in ~${s.hours_from_now} h`));
    }
    if (f.ash_forecast) {
      const a = f.ash_forecast;
      facts.push(a.hours_from_now === null
        ? (id ? `${pathName(a.source, lang)}: sumber abu ${nf(a.closest_km, 1)} km dari sini` : `${pathName(a.source, lang)}: ash source ${nf(a.closest_km, 1)} km from here`)
        : (id ? `Abu ${pathName(a.source, lang)} melintas ${nf(a.closest_km, 1)} km dalam ±${a.hours_from_now} jam` : `Ash from ${pathName(a.source, lang)} passes ${nf(a.closest_km, 1)} km away in ~${a.hours_from_now} h`));
    }
    if (volc) facts.push(`${volcanoName(volc.name, lang)} · ${volcanoLevel(volc.level, lang)} · ${nf(volc.distance_km, 1)} km`);
    if (f.fire_prone_forest) {
      const fo = f.fire_prone_forest;
      facts.push(`${forestName(fo.name, lang)} · ${forestRisk(fo.risk, lang)} · ${nf(fo.distance_km, 1)} km`);
    }
    if (f.ai_detection_check) {
      const c = f.ai_detection_check;
      facts.push(id
        ? `Cek AI (RandomForest, NASA FIRMS): ${c.fire_like} dari ${c.checked} deteksi terdekat berpola api`
        : `AI check (RandomForest, NASA FIRMS): ${c.fire_like} of ${c.checked} nearest detections look like fires`);
    }
    if (f.data_as_of?.fires) facts.push(id ? `Data titik api per ${f.data_as_of.fires}` : `Fire data as of ${f.data_as_of.fires}`);
  }

  return (
    <section
      className="w-full rounded-2xl p-3.5 aurora-glass-card border border-amber-300/40 shadow-2xl text-slate-100 text-[11.5px] leading-snug max-h-[calc(100vh-22rem)] overflow-y-auto"
      aria-label={id ? "Ringkasan AI" : "AI brief"}
    >
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-300 text-slate-900">AI</span>
        <strong className="text-white text-xs">{id ? "Ringkasan AI untuk area ini" : "AI brief for this area"}</strong>
        <button type="button" onClick={toggle} className="ml-auto p-1 rounded-full hover:bg-white/10 cursor-pointer" title={id ? "Tutup" : "Close"} aria-label={id ? "Tutup" : "Close"}>
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <button type="button" onClick={fromCentre} disabled={loading} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10.5px] font-bold cursor-pointer disabled:opacity-50 ${where === "centre" ? "bg-white/15 border-white/30" : "border-white/15 hover:bg-white/10"}`}>
          <Crosshair className="w-3 h-3" aria-hidden="true" /> {id ? "Tengah peta" : "Map centre"}
        </button>
        <button type="button" onClick={fromGps} disabled={loading} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10.5px] font-bold cursor-pointer disabled:opacity-50 ${where === "gps" ? "bg-white/15 border-white/30" : "border-white/15 hover:bg-white/10"}`}>
          <LocateFixed className="w-3 h-3" aria-hidden="true" /> {id ? "Lokasi saya" : "My location"}
        </button>
        {point && (
          <button type="button" onClick={() => load(point.lat, point.lon, where)} disabled={loading} className="flex items-center gap-1 px-2 py-1 rounded-full border border-white/15 hover:bg-white/10 text-[10.5px] font-bold cursor-pointer disabled:opacity-50" title={id ? "Muat ulang" : "Refresh"} aria-label={id ? "Muat ulang" : "Refresh"}>
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        )}
        {point && <span className="font-mono text-[10px] text-slate-400">{nf(point.lat, 3)}°, {nf(point.lon, 3)}°</span>}
      </div>

      {loading && (
        <p className="mt-3 flex items-center gap-2 text-amber-200" role="status">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" aria-hidden="true" />
          {id ? "AI sedang membaca data titik api, angin, dan gunung api…" : "AI is reading the fire, wind and volcano data…"}
        </p>
      )}

      {error && !loading && (
        <p className="mt-3 text-amber-200" role="alert">{id ? "Ringkasan belum tersedia" : "Brief unavailable"}: {error}</p>
      )}

      {data && !loading && (
        <div className="mt-3 flex flex-col gap-2.5">
          {sc && <span className={`self-start text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${sc.cls}`}>{id ? sc.id : sc.en}</span>}

          {b ? (
            <>
              <h3 className="text-[13px] font-extrabold text-white leading-tight">{b.headline}</h3>
              <p className="text-slate-200">{b.summary}</p>
              <div>
                <strong className="block text-[10px] uppercase tracking-wide text-amber-200 mb-1">{id ? "Yang perlu dilakukan" : "What to do"}</strong>
                <ul className="flex flex-col gap-1">
                  {b.actions.map((a) => (
                    <li key={a} className="flex gap-1.5"><span className="text-emerald-300" aria-hidden="true">✓</span><span>{a}</span></li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-amber-200">{id ? "Teks AI tidak tersedia; berikut datanya." : "AI text unavailable; here are the facts."}</p>
          )}

          <div className="pt-2 border-t border-white/10">
            <strong className="block text-[10px] uppercase tracking-wide text-slate-300 mb-1">{id ? "Data yang dipakai AI" : "Data the AI used"}</strong>
            <ul className="flex flex-col gap-0.5 text-[10.5px] text-slate-300">
              {facts.map((t) => <li key={t}>• {t}</li>)}
            </ul>
          </div>

          <p className="text-[10px] text-slate-400">
            {b?.engine === "featherless"
              ? (id ? `Ditulis oleh ${b.model} (Featherless) dari data di atas. Semua angka berasal dari data.` : `Written by ${b.model} (Featherless) from the data above. Every number comes from the data.`)
              : (id ? "Teks templat (AI tidak tersedia)." : "Template text (AI unavailable).")}
          </p>
          <p className="text-[10px] text-slate-400">
            {id ? "Bukan peringatan resmi. Ikuti arahan BMKG, PVMBG, dan BPBD setempat." : "Not an official warning. Follow BMKG, PVMBG and your local BPBD."}
          </p>
        </div>
      )}
    </section>
  );
};

export default AiBrief;
