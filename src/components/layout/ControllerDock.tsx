import React, { useState, useEffect } from "react";
import { Zap, Play, Printer, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import type { HazardType, ModelingMode, SimulationOverrides } from "../../types/api";
import { api } from "../../services/api";
import { CONFIG } from "../../config/constants";
import { useLanguage } from "../../context/useLanguage";
import { forestName, forestRisk, forestType, provinceName, regionName, volcanoLevel, volcanoName } from "../../utils/apiLabels";

interface ControllerDockProps {
  hazard: HazardType;
  onHazardChange: (hazard: HazardType) => void;
  eventId: string;
  onEventChange: (eventId: string) => void;
  mode: ModelingMode;
  onModeChange: (mode: ModelingMode) => void;
  overrides: SimulationOverrides;
  onOverridesChange: (overrides: SimulationOverrides) => void;
  onRunSimulation: () => void;
  onRunDemo: () => void;
  isRunning: boolean;
  progressText: string;
  activeRunId?: string | null;
  /** Tailwind top offset; App places the dock below the simulation-tools button. */
  topClass?: string;
}

export const ControllerDock: React.FC<ControllerDockProps> = ({
  hazard,
  onHazardChange,
  eventId,
  onEventChange,
  mode,
  onModeChange,
  overrides,
  onOverridesChange,
  onRunSimulation,
  onRunDemo,
  isRunning,
  progressText,
  activeRunId,
  topClass = "top-16 sm:top-20"
}) => {
  const { lang } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return typeof window !== "undefined" && window.innerWidth < 640;
  });
  const [volcanoGroups, setVolcanoGroups] = useState<Record<string, any[]>>({});
  const [forestGroups, setForestGroups] = useState<Record<string, any[]>>({});

  useEffect(() => {
    api.getNationalVolcanoes()
      .then((geo) => {
        const features = geo?.features || [];
        const groups: Record<string, any[]> = {
          "Sumatra": [],
          "Java": [],
          "Bali & Nusa Tenggara": [],
          "Sulawesi": [],
          "Maluku & Papua": []
        };
        features.forEach((f: any) => {
          const reg = f.properties?.region || "Other";
          if (!groups[reg]) groups[reg] = [];
          groups[reg].push(f);
        });
        setVolcanoGroups(groups);
      })
      .catch((err) => console.error("Failed loading volcanoes catalog:", err));

    api.getNationalForests()
      .then((forests) => {
        const list = Array.isArray(forests) ? forests : (forests?.forests || []);
        const groups: Record<string, any[]> = {
          "Sumatra": [],
          "Kalimantan": [],
          "Java": [],
          "Bali & Nusa Tenggara": [],
          "Sulawesi": [],
          "Maluku & Papua": []
        };
        list.forEach((k: any) => {
          const reg = k.region || "Other";
          if (!groups[reg]) groups[reg] = [];
          groups[reg].push(k);
        });
        setForestGroups(groups);
      })
      .catch((err) => console.error("Failed loading forest catalog:", err));
  }, []);

  return (
    <div
      className={`absolute ${topClass} left-2 sm:left-4 w-[calc(100%-1rem)] sm:w-80 max-w-sm max-h-[calc(100vh-180px)] aurora-glass-card rounded-2xl shadow-2xl z-[1000] flex flex-col overflow-hidden transition-all duration-300 text-slate-100`}
    >
      {/* Header Dock */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between shrink-0 cursor-pointer select-none border-b border-white/10"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="font-extrabold text-xs block text-white">
              {lang === "id" ? "Pusat Kendali Simulasi" : "Simulation Control Center"}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              {lang === "id" ? "Model Lagrangian RK2 (15 Ensemble)" : "Lagrangian RK2 Model (15 Ensembles)"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isCollapsed && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-rose-600 text-white animate-pulse sm:hidden">
              {lang === "id" ? "Buka" : "Open"}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1.5 rounded-lg transition cursor-pointer hover:bg-white/10 text-slate-300"
            title={isCollapsed ? (lang === "id" ? "Buka Panel" : "Open Panel") : (lang === "id" ? "Tutup Panel" : "Collapse Panel")}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Dock */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]">
          {/* Hazard Selection */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 text-slate-300">
              {lang === "id" ? "Jenis Bencana Atmosferik:" : "Atmospheric Hazard Type:"}
            </label>
            <select
              value={hazard}
              onChange={(e) => onHazardChange(e.target.value as HazardType)}
              className="w-full rounded-xl px-3 py-2 text-xs outline-none transition font-medium bg-black/40 border border-white/15 text-white shadow-xs focus:border-purple-400"
            >
              <option value="volcano">🌋 {lang === "id" ? "Erupsi Gunung Api (Abu Vulkanik)" : "Volcanic Eruption (Ash Plume)"}</option>
              <option value="fire">🔥 {lang === "id" ? "Kebakaran Gambut (Asap PM2.5)" : "Peatland Wildfire (PM2.5 Smoke)"}</option>
            </select>
          </div>

          {/* Event Location Selection */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 text-slate-300">
              {lang === "id" ? "Lokasi Bahaya (Nasional):" : "Hazard Location (National):"}
            </label>
            <select
              value={eventId}
              onChange={(e) => onEventChange(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-xs outline-none transition font-medium bg-black/40 border border-white/15 text-white shadow-xs focus:border-purple-400"
            >
              {hazard === "volcano" ? (
                Object.keys(volcanoGroups).length > 0 ? (
                  Object.entries(volcanoGroups).map(([reg, list]) => {
                    if (list.length === 0) return null;
                    return (
                      <optgroup key={reg} label={`${lang === "id" ? "Gunung api" : "Volcanoes"} · ${regionName(reg, lang)} (${list.length})`} className="bg-slate-900 text-white">
                        {list.map((f) => {
                          const p = f.properties || f;
                          const id = p.event_id || p.id;
                          const elevation = Math.round(p.elevation_m || 0).toLocaleString(lang === "id" ? "id-ID" : "en-US");
                          return (
                            <option key={id} value={id}>
                              {`[${volcanoLevel(p.level, lang)}] ${volcanoName(p.name, lang)} (${provinceName(p.province, lang)}) · ${elevation} m`}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })
                ) : (
                  <optgroup label={lang === "id" ? "Gunung api aktif PVMBG" : "Active PVMBG volcanoes"} className="bg-slate-900 text-white">
                    {([
                      ["anak_krakatau_2026_09", 3, "Anak Krakatau", "Sunda Strait", "Selat Sunda"],
                      ["merapi_yogyakarta", 3, "Merapi", "Central Java / DIY", "Jawa Tengah / DIY"],
                      ["lewotobi_laki_laki", 4, "Lewotobi Laki-laki", "East Nusa Tenggara", "NTT"],
                      ["marapi_sumatera", 3, "Marapi", "West Sumatra", "Sumatera Barat"],
                      ["semeru", 3, "Semeru", "East Java", "Jawa Timur"],
                      ["agung", 2, "Agung", "Bali", "Bali"],
                      ["rinjani", 2, "Rinjani", "Lombok, West Nusa Tenggara", "Lombok, NTB"],
                      ["sinabung", 2, "Sinabung", "North Sumatra", "Sumatera Utara"]
                    ] as const).map(([value, level, name, areaEn, areaId]) => (
                      <option key={value} value={value}>
                        {`[${volcanoLevel(level, lang)}] ${volcanoName(`G. ${name}`, lang)} (${lang === "id" ? areaId : areaEn})`}
                      </option>
                    ))}
                  </optgroup>
                )
              ) : (
                Object.keys(forestGroups).length > 0 ? (
                  Object.entries(forestGroups).map(([reg, list]) => {
                    if (list.length === 0) return null;
                    return (
                      <optgroup key={reg} label={`${lang === "id" ? "Hutan rawan api" : "Fire-prone forests"} · ${regionName(reg, lang)} (${list.length})`} className="bg-slate-900 text-white">
                        {list.map((k) => (
                          <option key={k.id} value={k.id}>
                            {`[${forestRisk(k.risk_level, lang)}] ${forestName(k.name, lang)} · ${forestType(k.forest_type, lang)}`}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })
                ) : (
                  <optgroup label={lang === "id" ? "Wilayah kebakaran gambut" : "Peatland wildfire regions"} className="bg-slate-900 text-white">
                    <option value="hutan_sebangau">{lang === "id" ? "[Sangat Rawan] Taman Nasional Sebangau · Rawa gambut tropis" : "[Very high risk] Sebangau National Park · Tropical peat swamp"}</option>
                    <option value="hutan_eks_plg">{lang === "id" ? "[Sangat Rawan] Lahan Gambut Eks-PLG · Gambut kritis" : "[Very high risk] Ex-PLG Peatland · Critical peat"}</option>
                    <option value="live_kalimantan">{lang === "id" ? "Kebakaran gambut Kalimantan (NASA FIRMS langsung)" : "Kalimantan peatland fires (NASA FIRMS live)"}</option>
                  </optgroup>
                )
              )}
            </select>
          </div>

          {/* Mode Switcher */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 text-slate-300">
              {lang === "id" ? "Mode Pemodelan:" : "Modeling Mode:"}
            </label>
            <div className="grid grid-cols-2 rounded-xl p-1 text-center text-xs bg-black/40 border border-white/10 shadow-xs">
              <button
                type="button"
                onClick={() => onModeChange("auto")}
                className="py-1.5 rounded-lg font-bold transition cursor-pointer"
                style={mode === "auto" ? {
                  background: "linear-gradient(135deg, rgba(42, 60, 48, 0.95), rgba(75, 48, 65, 0.95))",
                  color: "#FFFFFF",
                  boxShadow: "0 2px 8px rgba(163, 147, 191, 0.3)",
                  border: "1px solid rgba(212, 163, 184, 0.4)"
                } : {
                  color: "rgba(255, 255, 255, 0.6)"
                }}
              >
                {lang === "id" ? "Otomatis (Data Nyata)" : "Auto (Real Data)"}
              </button>
              <button
                type="button"
                onClick={() => onModeChange("experiment")}
                className="py-1.5 rounded-lg font-bold transition cursor-pointer"
                style={mode === "experiment" ? {
                  background: "linear-gradient(135deg, rgba(42, 60, 48, 0.95), rgba(75, 48, 65, 0.95))",
                  color: "#FFFFFF",
                  boxShadow: "0 2px 8px rgba(163, 147, 191, 0.3)",
                  border: "1px solid rgba(212, 163, 184, 0.4)"
                } : {
                  color: "rgba(255, 255, 255, 0.6)"
                }}
              >
                {lang === "id" ? "Eksperimen Skenario" : "What-If Experiment"}
              </button>
            </div>
          </div>

          {/* Experiment Parameters */}
          {mode === "experiment" && (
            <div className="rounded-xl p-3 space-y-2.5 text-xs bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{lang === "id" ? "Parameter Skenario Eksperimen" : "What-If Scenario Parameters"}</span>
              </div>

              {hazard === "volcano" ? (
                <div>
                  <label className="text-[10px] font-medium block mb-1 text-slate-300">
                    {lang === "id" ? "Tinggi Kolom (km di atas kawah):" : "Column Height (km above crater):"}
                  </label>
                  <input
                    type="number"
                    value={overrides.column_height_km ?? 12}
                    min={1}
                    max={25}
                    step={0.5}
                    onChange={(e) =>
                      onOverridesChange({ ...overrides, column_height_km: parseFloat(e.target.value) })
                    }
                    className="w-full rounded-lg px-2.5 py-1.5 font-mono text-xs bg-black/40 border border-white/15 text-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-medium block mb-1 text-slate-300">
                    {lang === "id" ? "Skala Radiasi Api (FRP %):" : "Fire Radiative Power Scale (FRP %):"} {overrides.frp_scale ? overrides.frp_scale * 100 : 100}%
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={200}
                    value={overrides.frp_scale ? overrides.frp_scale * 100 : 100}
                    onChange={(e) =>
                      onOverridesChange({ ...overrides, frp_scale: parseFloat(e.target.value) / 100 })
                    }
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-2 text-[11px] cursor-pointer pt-1 font-medium text-slate-200">
                  <input
                    type="checkbox"
                    checked={overrides.wind_reverse_troposphere ?? false}
                    onChange={(e) =>
                      onOverridesChange({ ...overrides, wind_reverse_troposphere: e.target.checked })
                    }
                    className="rounded accent-purple-400"
                  />
                  <span>{lang === "id" ? "Pembalikan Arah Angin Troposfer (180°)" : "Reverse Tropospheric Wind (180°)"}</span>
                </label>
              </div>

              <div>
                <label className="text-[10px] font-medium block mb-1 text-slate-300">
                  {lang === "id" ? "Laju Deposisi Basah Hujan (mm/jam):" : "Rain Wet Deposition Rate (mm/h):"}
                </label>
                <input
                  type="number"
                  value={overrides.rain_scavenging_mm_h ?? 0}
                  min={0}
                  max={50}
                  step={5}
                  onChange={(e) =>
                    onOverridesChange({ ...overrides, rain_scavenging_mm_h: parseFloat(e.target.value) })
                  }
                  className="w-full rounded-lg px-2.5 py-1.5 font-mono text-xs bg-black/40 border border-white/15 text-white"
                />
              </div>
            </div>
          )}

          {/* Main Execution Button */}
          <button
            onClick={onRunSimulation}
            disabled={isRunning}
            className="w-full py-3 px-4 aurora-pill aurora-btn font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 text-white shadow-xl active:scale-98"
          >
            <Zap className={`w-4 h-4 text-emerald-400 ${isRunning ? "animate-spin" : ""}`} />
            <span>
              {isRunning
                ? (lang === "id" ? "MENGHITUNG SEBARAN..." : "CALCULATING PLUME...")
                : (lang === "id" ? "JALANKAN SIMULASI ENSEMBLE" : "RUN DISPERSION SIMULATION")}
            </span>
          </button>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={onRunDemo}
              disabled={isRunning}
              className="py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer aurora-btn text-white shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
              <span>{lang === "id" ? "Putar Demo" : "Play Demo"}</span>
            </button>
            <button
              onClick={() => {
                if (activeRunId) {
                  window.open(`${CONFIG.API_BASE}/runs/${activeRunId}/export?format=html`, "_blank");
                } else {
                  window.print();
                }
              }}
              className="py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer aurora-btn text-white shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-purple-300" />
              <span>{lang === "id" ? "Unduh Laporan" : "Export Report"}</span>
            </button>
          </div>

          {/* Progress Indicator */}
          {isRunning && (
            <div className="pt-2">
              <div className="h-1.5 rounded-full overflow-hidden bg-white/10">
                <div className="h-full animate-pulse w-3/4 rounded-full bg-gradient-to-r from-emerald-400 to-rose-400" />
              </div>
              <span className="text-[10px] block text-center mt-1 font-mono font-bold text-emerald-300">
                {progressText}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ControllerDock;
