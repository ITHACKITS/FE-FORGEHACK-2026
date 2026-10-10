/**
 * components/layout/MapReadouts.tsx - Camera readout and scale bar.
 * They subscribe to the Leaflet map themselves, so a pan re-renders only these small
 * components (at most once per animation frame) instead of the whole map workspace.
 */

import React, { useEffect, useMemo, useState } from "react";
import type L from "leaflet";

interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}

/** Map centre and zoom; `live` follows every frame of a pan, otherwise only its end. */
function useMapView(map: L.Map | null, live: boolean): MapView | null {
  const [view, setView] = useState<MapView | null>(null);
  useEffect(() => {
    if (!map) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const c = map.getCenter();
      setView({ lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    const events = live ? "move zoomend" : "moveend zoomend";
    map.on(events, schedule);
    schedule();
    return () => {
      map.off(events, schedule);
      cancelAnimationFrame(raf);
    };
  }, [map, live]);
  return view;
}

export const CameraReadout: React.FC<{ map: L.Map | null; lang: "id" | "en" }> = ({ map, lang }) => {
  const view = useMapView(map, true);
  if (!view) return null;
  const altitude = Math.round(25_000_000 / Math.pow(2, view.zoom));
  return (
    <div className="absolute bottom-2 right-4 z-[500] hidden sm:flex items-center gap-3 text-[10px] font-mono text-slate-300/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
      <span>{lang === "id" ? "Kamera" : "Camera"}: {altitude.toLocaleString(lang === "id" ? "id-ID" : "en-US")} m</span>
      <span className="text-white/30">&bull;</span>
      <span>
        {Math.abs(view.lat).toFixed(4)}°{view.lat >= 0 ? "N" : "S"}{" "}
        {Math.abs(view.lng).toFixed(4)}°{view.lng >= 0 ? "E" : "W"}
      </span>
    </div>
  );
};

/** Scale bar for the exposure map: a round distance that spans roughly 70-130 px. */
export const ScaleBar: React.FC<{ map: L.Map | null; lang: "id" | "en" }> = ({ map, lang }) => {
  const view = useMapView(map, false);
  const bar = useMemo(() => {
    if (!view) return null;
    const mpp = (40_075_016.686 * Math.cos((view.lat * Math.PI) / 180)) / (256 * Math.pow(2, view.zoom));
    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
    const km = steps.filter((k) => (k * 1000) / mpp <= 130).pop() ?? 1;
    return { km, px: Math.round((km * 1000) / mpp) };
  }, [view]);
  if (!bar) return null;
  return (
    <div className="hidden sm:flex items-end gap-3 px-2.5 py-1.5 rounded-xl bg-[#F6F0E2]/90 border border-[#16302A]/15 text-[#16302A] font-mono text-[10.5px] shadow-md" aria-hidden="true">
      <div className="flex flex-col items-start gap-0.5">
        <span>{bar.km} km</span>
        <span className="block h-[3px] bg-[#16302A]" style={{ width: bar.px }} />
      </div>
      <div className="flex flex-col items-center leading-none">
        <svg width="12" height="16" viewBox="-6 -12 12 16"><path d="M0 -12L5 4L0 0L-5 4Z" fill="#16302A" /></svg>
        <span className="mt-0.5">{lang === "id" ? "U" : "N"}</span>
      </div>
    </div>
  );
};
