import React from "react";
import type { HospitalItem } from "../../types/api";

interface TabEvacProps {
  healthcare: HospitalItem[];
  onFlyTo: (lat: number, lng: number) => void;
}

export const TabEvac: React.FC<TabEvacProps> = ({ healthcare, onFlyTo }) => {
  const safeCount = healthcare.filter((h) => {
    const prob = h.exposure_pct ?? h.exposure_prob_pct ?? (h.exposure_probability ? h.exposure_probability * 100 : 0);
    return h.is_safe !== undefined ? h.is_safe : prob < 10;
  }).length;
  const impactedCount = healthcare.length - safeCount;

  return (
    <div className="space-y-3 text-xs text-slate-100">
      <div>
        <span className="inline-block bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
          EMERGENCY REFERRAL SYSTEM
        </span>
        <h3 className="font-extrabold text-sm text-white">Hospital &amp; Healthcare Zone Classification</h3>
        <p className="text-[11px] text-slate-400">
          Ensuring patients with acute respiratory distress &amp; ARI are routed to facilities with clean sterile air.
        </p>

        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-center shadow-xs">
            <span className="text-[10px] text-emerald-300 block font-medium">Safe Referral Hospitals</span>
            <strong className="text-emerald-400 text-sm font-mono">{safeCount}</strong>
          </div>
          <div className="p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-xl text-center shadow-xs">
            <span className="text-[10px] text-rose-300 block font-medium">Exposed Danger Hospitals</span>
            <strong className="text-rose-400 text-sm font-mono">{impactedCount}</strong>
          </div>
        </div>
      </div>

      {healthcare.length === 0 ? (
        <div className="p-4 text-center text-slate-300 bg-white/5 rounded-2xl border border-white/10 text-xs shadow-xs">
          ✅ All referral hospitals are located inside clean safe zones free of aerosol contamination.
        </div>
      ) : (
        <div className="space-y-2">
          {healthcare.map((h) => {
            const prob = h.exposure_pct ?? h.exposure_prob_pct ?? (h.exposure_probability ? Math.round(h.exposure_probability * 100) : 0);
            const isSafe = h.is_safe !== undefined ? h.is_safe : prob < 10;
            const isCritical = prob >= 40;

            const badgeClass = isSafe
              ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
              : isCritical
              ? "bg-rose-950/60 text-rose-300 border-rose-500/40"
              : "bg-amber-950/60 text-amber-300 border-amber-500/40";

            const badgeText = h.status_badge || (isSafe
              ? "PRIMARY REFERRAL (CLEAN AIR)"
              : isCritical
              ? "HEAVY ASH IMPACT"
              : "BUFFER WATCH HOSPITAL");

            const hLat = h.lat ?? h.latitude ?? 0;
            const hLng = h.lng ?? h.longitude ?? 0;
            const dist = h.distance_from_epicenter_km ?? h.distance_from_source_km;

            return (
              <div key={h.facility_id || h.id || h.name} className="border border-white/10 bg-white/5 rounded-2xl p-3 text-slate-100 shadow-xs">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <h4 className="font-bold text-white text-xs">🏥 {h.name}</h4>
                    <div className="text-slate-400 text-[10px]">
                      {h.district || "Referral Facility"} {dist ? `• ${dist} km from epicenter` : ""}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${badgeClass}`}>
                    {badgeText}
                  </span>
                </div>

                {h.evac_recommendation && (
                  <p className="text-[10px] text-slate-300 my-1.5 bg-black/30 p-2 rounded-xl border border-white/5">
                    {h.evac_recommendation}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 my-2 py-1.5 px-2.5 bg-black/40 rounded-xl border border-white/10 text-[10px]">
                  <div>
                    <span className="text-slate-400 block">Exposure Status:</span>
                    <strong className={isSafe ? "text-emerald-400" : "text-amber-300"}>
                      {isSafe ? "Safe (0% - 10%)" : `Exposed ${prob}%`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Emergency Hotline:</span>
                    <strong className="text-sky-300">{h.emergency_hotline || "SPGDT 119"}</strong>
                  </div>
                </div>

                {h.capabilities && h.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {h.capabilities.map((c, idx) => (
                      <span key={idx} className="bg-white/10 text-slate-300 text-[9px] px-2 py-0.5 rounded-full border border-white/10">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-1 border-t border-white/10">
                  <button
                    onClick={() => onFlyTo(hLat, hLng)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-full text-[10px] font-medium transition cursor-pointer shadow-xs"
                  >
                    Focus on Map
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TabEvac;
