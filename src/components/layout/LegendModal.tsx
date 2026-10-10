import React, { useEffect } from "react";
import { X, Layers, Flame, ShieldAlert, Info } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

interface LegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegendModal: React.FC<LegendModalProps> = ({ isOpen, onClose }) => {
  const { lang } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col aurora-glass-card border border-white/20 text-slate-100 transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0 bg-black/40 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white">
                {lang === "id" ? "Keterangan Peta: Status Gunung & Ancaman Udara" : "Map Legend: Volcano Status & Air Hazards"}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === "id"
                  ? "Berdasarkan data resmi PVMBG ESDM dan prediksi sebaran ensemble komputer."
                  : "Based on official PVMBG ESDM data and computer ensemble dispersion predictions."}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer hover:bg-white/10 text-slate-300 hover:text-white"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto bg-[#0f131a]/80">
          {/* Section 1: Volcano Activity Levels */}
          <div className="rounded-2xl p-4 space-y-3 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-sm tracking-wide text-white">
                Volcano Activity Levels (PVMBG ESDM)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Level IV */}
              <div className="p-3 rounded-xl flex items-start gap-3 transition bg-red-950/40 border border-red-500/30">
                <img src="/4_awas.png" alt="Warning" className="w-8 h-8 shrink-0 object-contain" />
                <div>
                  <strong className="text-xs font-bold block text-red-400">
                    Level IV (WARNING / AWAS)
                  </strong>
                  <span className="text-[11px] leading-relaxed block text-slate-300 mt-0.5">
                    Volcano is erupting or eruption is imminent. Danger zone radius ≥ 7-10 km is highly hazardous.
                  </span>
                </div>
              </div>

              {/* Level III */}
              <div className="p-3 rounded-xl flex items-start gap-3 transition bg-orange-950/40 border border-orange-500/30">
                <img src="/3_siaga.png" alt="Watch" className="w-8 h-8 shrink-0 object-contain" />
                <div>
                  <strong className="text-xs font-bold block text-amber-400">
                    Level III (WATCH / SIAGA)
                  </strong>
                  <span className="text-[11px] leading-relaxed block text-slate-300 mt-0.5">
                    Volcanic activity increasing drastically. Ash eruptions may occur at any time.
                  </span>
                </div>
              </div>

              {/* Level II */}
              <div className="p-3 rounded-xl flex items-start gap-3 transition bg-yellow-950/40 border border-yellow-500/30">
                <img src="/2_waspada.png" alt="Advisory" className="w-8 h-8 shrink-0 object-contain" />
                <div>
                  <strong className="text-xs font-bold block text-yellow-300">
                    Level II (ADVISORY / WASPADA)
                  </strong>
                  <span className="text-[11px] leading-relaxed block text-slate-300 mt-0.5">
                    Volcanic activity above normal baseline. Continuous close monitoring active.
                  </span>
                </div>
              </div>

              {/* Level I */}
              <div className="p-3 rounded-xl flex items-start gap-3 transition bg-emerald-950/40 border border-emerald-500/30">
                <img src="/1_normal.png" alt="Normal" className="w-8 h-8 shrink-0 object-contain" />
                <div>
                  <strong className="text-xs font-bold block text-emerald-400">
                    Level I (NORMAL)
                  </strong>
                  <span className="text-[11px] leading-relaxed block text-slate-300 mt-0.5">
                    Volcano condition safe. No threat of eruption in the near future.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Dispersion Probability */}
          <div className="rounded-2xl p-4 space-y-3 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm tracking-wide text-white">
                Ash / Smoke Dispersion Probability Tiers
              </h3>
            </div>

            <div className="space-y-2.5">
              {/* P90 */}
              <div className="p-3 rounded-xl flex items-start gap-3 transition bg-rose-950/40 border border-rose-500/30">
                <div className="w-4 h-4 rounded-md shrink-0 mt-0.5 bg-rose-600 shadow-sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <strong className="text-xs font-bold text-rose-300">
                      P90 (Core Danger Zone)
                    </strong>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-rose-900/80 text-rose-200 border border-rose-600/40">
                      ≥ 90%
                    </span>
                  </div>
                  <span className="text-[11px] leading-relaxed block text-slate-300">
                    Impact probability ≥ 90%. Severe respiratory hazard. N95 respirator mask or immediate evacuation mandatory.
                  </span>
                </div>
              </div>

              {/* P50 */}
              <div className="p-3 rounded-xl flex items-start gap-3 transition bg-amber-950/40 border border-amber-500/30">
                <div className="w-4 h-4 rounded-md shrink-0 mt-0.5 bg-amber-500 shadow-sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <strong className="text-xs font-bold text-amber-300">
                      P50 (Watch Area)
                    </strong>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-amber-900/80 text-amber-200 border border-amber-500/40">
                      50% – 89%
                    </span>
                  </div>
                  <span className="text-[11px] leading-relaxed block text-slate-300">
                    Impact probability 50%–89%. Caution for moderate ashfall and degraded air quality.
                  </span>
                </div>
              </div>

              {/* P5 */}
              <div className="p-3 rounded-xl flex items-start gap-3 transition bg-yellow-950/40 border border-yellow-500/30">
                <div className="w-4 h-4 rounded-md shrink-0 mt-0.5 bg-yellow-400 shadow-sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <strong className="text-xs font-bold text-yellow-300">
                      P5 (Maximum Plume Reach)
                    </strong>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-yellow-900/80 text-yellow-200 border border-yellow-500/40">
                      5% – 49%
                    </span>
                  </div>
                  <span className="text-[11px] leading-relaxed block text-slate-300">
                    Impact probability 5%–49%. Outer boundary of wind-borne thin ash plume.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: NASA FIRMS Thermal Hotspots */}
          <div className="rounded-2xl p-4 space-y-3 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <h3 className="font-bold text-sm tracking-wide text-white">
                NASA FIRMS Hotspots (Thermal Anomaly)
              </h3>
            </div>

            <div className="p-3 rounded-xl flex items-start gap-3 transition bg-orange-950/30 border border-orange-500/30">
              <img src="/titik_api.png" alt="Hotspot" className="w-8 h-8 shrink-0 object-contain" />
              <div className="flex-1">
                <strong className="text-xs font-bold block text-orange-300 mb-0.5">
                  Active Thermal Hotspot
                </strong>
                <span className="text-[11px] leading-relaxed block text-slate-300">
                  Satellite-detected active fire point. Larger marker radius indicates higher Fire Radiative Power (FRP in Megawatts).
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Public Facility Symbols */}
          <div className="rounded-2xl p-4 space-y-3 bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-sm tracking-wide text-white">
                Public Facility Symbols
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Schools */}
              <div className="p-3 rounded-xl flex flex-col gap-1.5 transition bg-teal-950/30 border border-teal-500/30">
                <div className="flex items-center gap-2">
                  <img src="/school.png" alt="School" className="w-6 h-6 object-contain" />
                  <strong className="text-xs font-bold text-teal-300">
                    Schools
                  </strong>
                </div>
                <span className="text-[11px] leading-relaxed text-slate-300">
                  Educational facilities. Recommended distance learning (remote school) if inside danger zone.
                </span>
              </div>

              {/* Healthcare */}
              <div className="p-3 rounded-xl flex flex-col gap-1.5 transition bg-cyan-950/30 border border-cyan-500/30">
                <div className="flex items-center gap-2">
                  <img src="/hospital.png" alt="Hospital" className="w-6 h-6 object-contain" />
                  <strong className="text-xs font-bold text-cyan-300">
                    Healthcare Facilities
                  </strong>
                </div>
                <span className="text-[11px] leading-relaxed text-slate-300">
                  Hospitals &amp; clinics. Primary referral destinations for respiratory emergency evacuation.
                </span>
              </div>

              {/* Airports */}
              <div className="p-3 rounded-xl flex flex-col gap-1.5 transition bg-purple-950/30 border border-purple-500/30">
                <div className="flex items-center gap-2">
                  <img src="/plane.png" alt="Airport" className="w-6 h-6 object-contain" />
                  <strong className="text-xs font-bold text-purple-300">
                    Airports
                  </strong>
                </div>
                <span className="text-[11px] leading-relaxed text-slate-300">
                  Airports. High risk of airspace closure due to volcanic ash turbine engine damage.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 flex items-center justify-center shrink-0 text-[11px] bg-black/40 border-t border-white/10 text-slate-400">
          <span>Authority: Geological Agency PVMBG &bull; NASA FIRMS VIIRS &bull; Open-Meteo GFS</span>
        </div>
      </div>
    </div>
  );
};

export default LegendModal;
