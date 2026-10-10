import React from "react";
import type { HazardType } from "../../types/api";
import { useTr } from "../../context/useLanguage";

interface TabHealthProps {
  hazard?: HazardType;
}

export const TabHealth: React.FC<TabHealthProps> = ({ hazard = "volcano" }) => {
  const tr = useTr();
  const isVolcano = hazard === "volcano";

  return (
    <div className="space-y-4 text-xs text-slate-100">
      <div>
        <span className="inline-block bg-rose-500/20 text-rose-300 border border-rose-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
          {tr("CRITICAL MEDICAL ADVISORY", "PERINGATAN MEDIS KRITIS")}
        </span>
        <h3 className="font-extrabold text-sm text-rose-400">
          {isVolcano
            ? tr("Fatal Contact Lens Hazard", "Bahaya Fatal Lensa Kontak (Softlens)")
            : tr("Peatland PM2.5 Fine Particulate Hazard", "Bahaya Partikulat Halus PM2.5 Asap Gambut")}
        </h3>

        <div className="bg-rose-950/50 border border-rose-500/40 rounded-2xl p-3.5 text-slate-100 mt-2 shadow-xs">
          <div className="font-bold text-xs text-rose-300 mb-1">
            {isVolcano
              ? tr("⚠️ STRICTLY FORBIDDEN: DO NOT WEAR CONTACT LENSES!", "⚠️ DILARANG KERAS: JANGAN MEMAKAI LENSA KONTAK!")
              : tr("⚠️ ARI & COMPREHENSIVE SMOKE HAZARD ZONE", "⚠️ ZONA BAHAYA ISPA & ASAP MENYELURUH")}
          </div>
          <p className="leading-relaxed text-[11px] text-slate-300">
            {isVolcano
              ? tr(
                  <>
                    Volcanic ash is not ordinary soil dust, but <strong>microscopic sharp silica glass shards</strong>. Wearing contact lenses traps crystalline silica under the lens, severely scratching the cornea when blinking, causing <strong>permanent corneal abrasion and irreversible blindness risk</strong>.
                  </>,
                  <>
                    Abu vulkanik bukan debu tanah biasa, melainkan <strong>serpihan kaca silika tajam berukuran mikroskopis</strong>. Lensa kontak memerangkap silika kristalin di bawah lensa sehingga kornea tergores parah setiap kali berkedip, dengan <strong>risiko luka kornea permanen dan kebutaan yang tidak dapat dipulihkan</strong>.
                  </>
                )
              : tr(
                  <>
                    Peatland wildfire smoke is heavily laden with <strong>PM2.5, carbon monoxide (CO), and volatile organic compounds (VOCs)</strong>. These fine particulates penetrate deep into lung alveoli, triggering <strong>acute bronchitis, severe asthma exacerbations, and hypoxia attacks</strong> especially in toddlers and seniors.
                  </>,
                  <>
                    Asap kebakaran gambut sarat dengan <strong>PM2.5, karbon monoksida (CO), dan senyawa organik mudah menguap (VOC)</strong>. Partikel halus ini masuk jauh ke alveolus paru dan memicu <strong>bronkitis akut, serangan asma berat, dan hipoksia</strong>, terutama pada balita dan lansia.
                  </>
                )}
          </p>
          <div className="mt-2.5 text-rose-200 font-medium text-[11px] bg-rose-900/60 p-2.5 rounded-xl border border-rose-500/40">
            {isVolcano
              ? tr(
                  <>Mandate: Remove contact lenses immediately. Wear <strong>Sealed Safety Goggles</strong> that tightly protect the eye perimeter.</>,
                  <>Wajib: Lepas lensa kontak segera. Pakai <strong>kacamata pelindung tertutup (goggles)</strong> yang rapat melindungi sekeliling mata.</>
                )
              : tr(
                  <>Mandate: Seal home windows tightly. Run <strong>HEPA filter Air Purifiers</strong> and strictly restrict children from outdoor activities.</>,
                  <>Wajib: Tutup rapat jendela rumah. Nyalakan <strong>pembersih udara dengan filter HEPA</strong> dan batasi ketat anak-anak beraktivitas di luar rumah.</>
                )}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        <span className="inline-block bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
          {tr("MEDICAL RESPIRATOR COMPARISON", "PERBANDINGAN RESPIRATOR MEDIS")}
        </span>
        <h3 className="font-bold text-xs text-white mb-2">{tr("Mask Filtration Efficiency Standards", "Standar Efisiensi Filtrasi Masker")}</h3>

        <div className="space-y-2.5">
          {/* Cloth & Surgical Masks */}
          <div className="border border-rose-500/30 bg-rose-950/30 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <strong className="text-rose-400 font-semibold text-xs">{tr("❌ Surgical & Cloth Masks", "❌ Masker Bedah & Kain")}</strong>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-rose-900/80 text-rose-200 border border-rose-500/40 font-bold">
                {tr("INEFFECTIVE", "TIDAK EFEKTIF")}
              </span>
            </div>
            <ul className="list-disc list-inside text-slate-300 text-[10px] space-y-0.5">
              <li>{tr("Pores are far too large (3 – 100 µm). Sub-micron aerosols penetrate straight into lungs.", "Pori terlalu besar (3 – 100 µm). Aerosol berukuran submikron langsung masuk ke paru-paru.")}</li>
              <li>{tr("Edge seal leaks reach 30% – 50% around nose and cheek gaps.", "Kebocoran di tepi masker mencapai 30% – 50% lewat celah hidung dan pipi.")}</li>
            </ul>
          </div>

          {/* N95 Respirator */}
          <div className="border border-emerald-500/40 bg-emerald-950/30 rounded-2xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <strong className="text-emerald-300 font-semibold text-xs">{tr("✅ N95 / KN95 / FFP2 Respirator", "✅ Respirator N95 / KN95 / FFP2")}</strong>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 font-bold">
                {tr("MANDATORY STANDARD", "STANDAR WAJIB")}
              </span>
            </div>
            <ul className="list-disc list-inside text-slate-300 text-[10px] space-y-0.5">
              <li>{tr("Electrostatic micro-particle filtration ≥ 95% down to 0.3 micron size.", "Filtrasi elektrostatis partikel mikro ≥ 95% hingga ukuran 0,3 mikron.")}</li>
              <li>{tr("Tight facial contour seal prevents unfiltered side leakage.", "Segel rapat mengikuti kontur wajah mencegah kebocoran udara tanpa filter dari samping.")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabHealth;
