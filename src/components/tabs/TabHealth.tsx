import React from "react";
import type { HazardType } from "../../types/api";
import { useLanguage } from "../../context/LanguageContext";

interface TabHealthProps {
  hazard?: HazardType;
}

export const TabHealth: React.FC<TabHealthProps> = ({ hazard = "volcano" }) => {
  const { lang } = useLanguage();
  const isVolcano = hazard === "volcano";

  return (
    <div className="space-y-4 text-xs text-slate-100">
      <div>
        <span className="inline-block bg-rose-500/20 text-rose-300 border border-rose-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
          {lang === "id" ? "PERINGATAN MEDIS KRITIS" : "CRITICAL MEDICAL ADVISORY"}
        </span>
        <h3 className="font-extrabold text-sm text-rose-400">
          {isVolcano 
            ? (lang === "id" ? "Bahaya Fatal Lensa Kontak (Softlens)" : "Fatal Contact Lens Hazard (Softlens)")
            : (lang === "id" ? "Bahaya Partikulat Halus PM2.5 Asap Gambut" : "Peatland PM2.5 Fine Particulate Hazard")}
        </h3>

        <div className="bg-rose-950/50 border border-rose-500/40 rounded-2xl p-3.5 text-slate-100 mt-2 shadow-xs">
          <div className="font-bold text-xs text-rose-300 mb-1">
            {isVolcano ? "⚠️ STRICTLY FORBIDDEN: DO NOT WEAR CONTACT LENSES!" : "⚠️ ARI & COMPREHENSIVE SMOKE HAZARD ZONE"}
          </div>
          <p className="leading-relaxed text-[11px] text-slate-300">
            {isVolcano ? (
              <>
                Volcanic ash is not ordinary soil dust, but <strong>microscopic sharp silica glass shards</strong>. Wearing contact lenses traps crystalline silica under the lens, severely scratching the cornea when blinking, causing <strong>permanent corneal abrasion and irreversible blindness risk</strong>.
              </>
            ) : (
              <>
                Peatland wildfire smoke is heavily laden with <strong>PM2.5, carbon monoxide (CO), and volatile organic compounds (VOCs)</strong>. These fine particulates penetrate deep into lung alveoli, triggering <strong>acute bronchitis, severe asthma exacerbations, and hypoxia attacks</strong> especially in toddlers and seniors.
              </>
            )}
          </p>
          <div className="mt-2.5 text-rose-200 font-medium text-[11px] bg-rose-900/60 p-2.5 rounded-xl border border-rose-500/40">
            {isVolcano ? (
              <>Mandate: Remove contact lenses immediately. Wear <strong>Sealed Safety Goggles</strong> that tightly protect the eye perimeter.</>
            ) : (
              <>Mandate: Seal home windows tightly. Run <strong>HEPA filter Air Purifiers</strong> and strictly restrict children from outdoor activities.</>
            )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        <span className="inline-block bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
          MEDICAL RESPIRATOR COMPARISON
        </span>
        <h3 className="font-bold text-xs text-white mb-2">Mask Filtration Efficiency Standards</h3>

        <div className="space-y-2.5">
          {/* Cloth & Surgical Masks */}
          <div className="border border-rose-500/30 bg-rose-950/30 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <strong className="text-rose-400 font-semibold text-xs">❌ Surgical &amp; Cloth Masks</strong>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-900/80 text-rose-200 border border-rose-500/40 font-bold">
                INEFFECTIVE
              </span>
            </div>
            <ul className="list-disc list-inside text-slate-300 text-[10px] space-y-0.5">
              <li>Pores are far too large (3 – 100 &mu;m). Sub-micron aerosols penetrate straight into lungs.</li>
              <li>Edge seal leaks reach 30% – 50% around nose and cheek gaps.</li>
            </ul>
          </div>

          {/* N95 Respirator */}
          <div className="border border-emerald-500/40 bg-emerald-950/30 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <strong className="text-emerald-300 font-semibold text-xs">✅ N95 / KN95 / FFP2 Respirator</strong>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 font-bold">
                MANDATORY STANDARD
              </span>
            </div>
            <ul className="list-disc list-inside text-slate-300 text-[10px] space-y-0.5">
              <li>Electrostatic micro-particle filtration &ge; 95% down to 0.3 micron size.</li>
              <li>Tight facial contour seal prevents unfiltered side leakage.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabHealth;
