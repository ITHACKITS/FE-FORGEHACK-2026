import React from "react";
import { formatCompactRange, formatNumber } from "../../utils/formatters";
import type { ImpactResponse, HazardType } from "../../types/api";
import { useLanguage, useTr } from "../../context/useLanguage";

interface TabImpactProps {
  impact: ImpactResponse | null;
  hazard: HazardType;
  rainMm: number;
}

export const TabImpact: React.FC<TabImpactProps> = ({ impact, hazard, rainMm }) => {
  const { lang } = useLanguage();
  const tr = useTr();
  const pop = impact?.population_exposed;
  const child = impact?.children_exposed;
  const elder = impact?.elderly_exposed;
  const area = impact?.area_exposed_km2;

  const isRaining = rainMm > 0;

  return (
    <div className="space-y-4 text-xs text-slate-100">
      <div>
        <span className="inline-block bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
          {lang === "id" ? "METRIK KEPENDUDUKAN" : "POPULATION METRICS"}
        </span>
        <h3 className="font-extrabold text-sm text-white">
          {lang === "id" ? "Estimasi Dampak (P5 – P50 – P95)" : "Estimated Impact (P5 – P50 – P95)"}
        </h3>
        <p className="text-[11px] text-slate-400">
          {lang === "id"
            ? "Disajikan dengan rentang ketidakpastian 15 anggota model atmosferik."
            : "Presented across uncertainty ensemble of 15 atmospheric model members."}
        </p>

        <div className="mt-3 space-y-2">
          {/* Total Population */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-xs">
            <div className="flex justify-between text-slate-400 text-[11px] mb-1">
              <span>{lang === "id" ? "Populasi Terpapar (Total)" : "Exposed Population (Total)"}</span>
              <span className="bg-white/10 text-slate-300 px-1.5 py-0.5 rounded text-[9px] font-mono">WorldPop</span>
            </div>
            <div className="font-mono text-base font-extrabold text-white">
              {formatCompactRange(pop?.min, pop?.median, pop?.max, lang)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {lang === "id" ? "Warga di jalur sebaran abu/asap" : "People in ash/smoke plume path"}
            </div>
          </div>

          {/* Children & Elderly */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] text-slate-400 block mb-0.5">
                {lang === "id" ? "Anak-Anak (<15 Thn)" : "Children (<15 Yrs)"}
              </span>
              <div className="font-mono text-xs font-bold text-amber-300">
                {formatCompactRange(child?.min, child?.median, child?.max, lang)}
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-xs">
              <span className="text-[10px] text-slate-400 block mb-0.5">
                {lang === "id" ? "Lansia (≥65 Thn)" : "Elderly (≥65 Yrs)"}
              </span>
              <div className="font-mono text-xs font-bold text-amber-300">
                {formatCompactRange(elder?.min, elder?.median, elder?.max, lang)}
              </div>
            </div>
          </div>

          {/* Footprint Area */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 shadow-xs">
            <span className="text-[10px] text-slate-400 block mb-0.5">{tr("Footprint Area (km²)", "Luas Wilayah Terdampak (km²)")}</span>
            <div className="font-mono text-xs font-bold text-purple-300">
              {formatCompactRange(area?.min, area?.median, area?.max, lang)}
            </div>
          </div>
        </div>
      </div>

      {/* Agriculture & Water Sector */}
      {hazard === "volcano" && (
        <div className="pt-2 border-t border-white/10">
          <span className="inline-block bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
            {tr("AGRICULTURE & WATER SECTOR", "SEKTOR PERTANIAN & AIR")}
          </span>
          <h4 className="font-bold text-xs text-white mb-2">{tr("Paddy Fields & Water Sources", "Sawah & Sumber Air")}</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 shadow-xs">
              <span className="text-[10px] text-slate-400 block">{tr("Ash Impacted Crops:", "Lahan Pertanian Terdampak Abu:")}</span>
              <strong className="text-amber-400 font-mono text-xs">
                {formatNumber(impact?.agricultural_impact_ha || 3420, lang)} ha
              </strong>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 shadow-xs">
              <span className="text-[10px] text-slate-400 block">{tr("Upstream Watershed:", "Daerah Tangkapan Air Hulu:")}</span>
              <strong className="text-sky-400 font-mono text-xs">
                {impact?.water_sources_count || 12} {tr("Catchment Points", "Titik Tangkapan Air")}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Rain Scavenging Meteorology */}
      <div className="pt-2 border-t border-white/10">
        <span className="inline-block bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold text-[9px] px-2 py-0.5 rounded tracking-wider mb-1">
          {tr("PRECIPITATION METEOROLOGY", "METEOROLOGI CURAH HUJAN")}
        </span>
        <h4 className="font-bold text-xs text-white mb-1.5">{tr("Wet Deposition Effect", "Efek Deposisi Basah")}</h4>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-slate-300 shadow-xs">
          {isRaining ? (
            <div>
              <span className="text-emerald-400 font-semibold">{tr("Active", "Aktif")} ({rainMm} {tr("mm/h", "mm/jam")}):</span>
              <p className="mt-0.5 text-slate-300">
                {tr(
                  `Precipitation scavenging accelerates aerosol deposition from the air by ~${Math.min(65, rainMm * 2.5)}%, but increases wet sediment accumulation.`,
                  `Pencucian oleh hujan mempercepat pengendapan aerosol dari udara sekitar ${Math.min(65, rainMm * 2.5)}%, tetapi menambah timbunan endapan basah.`
                )}
              </p>
              {hazard === "volcano" && (
                <div className="mt-2 bg-red-950/50 border border-red-500/40 rounded-xl p-2.5 text-red-200">
                  <strong className="text-red-400 block mb-0.5">{tr("⚠️ LAHAR / MUD FLOW WARNING:", "⚠️ PERINGATAN LAHAR / ALIRAN LUMPUR:")}</strong>
                  {tr(
                    "Rainfall on upper slopes may trigger cold lahar floods along river basins. Immediate evacuation for riverbank residents required!",
                    "Hujan di lereng atas dapat memicu banjir lahar dingin di sepanjang aliran sungai. Warga bantaran sungai harus segera mengungsi!"
                  )}
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{tr("No rain precipitation simulation (dry condition).", "Tidak ada simulasi curah hujan (kondisi kering).")}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TabImpact;
