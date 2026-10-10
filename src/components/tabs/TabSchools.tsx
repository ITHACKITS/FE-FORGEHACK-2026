import React from "react";
import type { SchoolItem } from "../../types/api";
import { useLanguage } from "../../context/LanguageContext";

interface TabSchoolsProps {
  schools: SchoolItem[];
  onFlyTo: (lat: number, lng: number) => void;
  onDrawRoute: (s: SchoolItem) => void;
}

export const TabSchools: React.FC<TabSchoolsProps> = ({
  schools,
  onFlyTo,
  onDrawRoute
}) => {
  const { lang } = useLanguage();

  return (
    <div className="space-y-3 text-xs text-slate-100">
      <div>
        <span className="inline-block bg-rose-500/20 text-rose-300 border border-rose-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
          {lang === "id" ? "PROTOKOL KESELAMATAN SISWA" : "STUDENT SAFETY PROTOCOL"}
        </span>
        <h3 className="font-extrabold text-sm text-white">
          {lang === "id" ? "Triase Sekolah & Pembelajaran Daring" : "School Triage & Remote Learning"}
        </h3>
        <p className="text-[11px] text-slate-400">
          {lang === "id"
            ? "Ambang batas: paparan ≥ 40% otomatis beralih ke pembelajaran daring (PJJ) untuk mencegah ISPA akut."
            : "Threshold: ≥ 40% exposure switches to online remote learning to prevent acute ARI respiratory illnesses."}
        </p>
      </div>

      {schools.length === 0 ? (
        <div className="p-4 text-center text-slate-300 bg-white/5 rounded-2xl border border-white/10 text-xs shadow-xs">
          {lang === "id" ? "✅ Tidak ada sekolah di dalam ambang bahaya pada skenario ini." : "✅ No schools detected inside danger threshold limits for this scenario."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {schools.map((s) => {
            const prob = s.exposure_pct ?? s.exposure_prob_pct ?? (s.exposure_probability ? Math.round(s.exposure_probability * 100) : 0);
            const isAwas = prob >= 40;
            const isWaspada = prob >= 15 && prob < 40;

            const borderClass = isAwas
              ? "border-rose-500/40 bg-rose-950/30"
              : isWaspada
              ? "border-amber-500/40 bg-amber-950/30"
              : "border-emerald-500/40 bg-emerald-950/30";

            const badgeText = s.action_code === "PJJ_DARING" || isAwas
              ? (lang === "id" ? "PERINGATAN • ALIHKAN KE PJJ DARING" : "WARNING • SWITCH TO REMOTE SCHOOL")
              : isWaspada
              ? (lang === "id" ? "HIMBAUAN • HENTIKAN AKTIVITAS LUAR" : "ADVISORY • SUSPEND OUTDOOR ACTIVITIES")
              : (lang === "id" ? "PANTAUAN AWAL (WASPADA)" : "EARLY WATCH (MONITORING)");

            const badgeColor = isAwas
              ? "bg-rose-600 text-white font-bold animate-pulse"
              : isWaspada
              ? "bg-amber-600 text-white font-bold"
              : "bg-emerald-600 text-white font-bold";

            const hospital = s.nearest_safe_hospital || s.nearest_hospital || {
              name: "Nearest Safe Hospital",
              distance_km: 4.5
            };

            const sLat = s.lat ?? s.latitude ?? 0;
            const sLng = s.lng ?? s.longitude ?? 0;
            const eta = s.eta_hours ?? s.arrival_time_earliest_h ?? 4;

            return (
              <div key={s.facility_id || s.id || s.name} className={`border rounded-2xl p-3.5 text-slate-100 shadow-xs ${borderClass}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h4 className="font-bold text-white text-xs">🏫 {s.name}</h4>
                    <div className="text-slate-400 text-[10px]">{s.district || "Exposed District"} &bull; {s.province || ""}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 shadow-xs ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 my-2 py-2 px-2.5 bg-black/40 rounded-xl border border-white/10">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Exposure Risk:</span>
                    <strong className="text-white text-xs font-mono">{prob}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Estimated Arrival (ETA):</span>
                    <strong className="text-amber-300 text-xs font-mono">T + {eta}:00 Hours</strong>
                  </div>
                </div>

                {s.action_detail && (
                  <p className="text-[10px] text-slate-300 mb-2 bg-black/30 p-2 rounded-lg border border-white/5">
                    {s.action_detail}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                  <span className="text-slate-400 truncate max-w-[170px] text-[10px]">
                    🚑 Referral Hospital: <strong className="text-sky-300">{hospital.name}</strong> ({hospital.distance_km} km)
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onFlyTo(sLat, sLng)}
                      className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-full text-[10px] transition cursor-pointer shadow-xs"
                    >
                      Focus
                    </button>
                    <button
                      onClick={() => onDrawRoute(s)}
                      className="px-2.5 py-1 aurora-btn rounded-full text-[10px] font-bold transition cursor-pointer shadow-xs text-white"
                    >
                      Evac Route
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TabSchools;
