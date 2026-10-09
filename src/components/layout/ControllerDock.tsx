import React, { useState, useEffect } from "react";
import { Zap, Play, Printer, ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import type { HazardType, ModelingMode, SimulationOverrides } from "../../types/api";
import { api } from "../../services/api";
import { CONFIG } from "../../config/constants";

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
  activeRunId
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    // Auto collapse on small screens for better map visibility by default
    return typeof window !== "undefined" && window.innerWidth < 640;
  });
  const [volcanoGroups, setVolcanoGroups] = useState<Record<string, any[]>>({});
  const [forestGroups, setForestGroups] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // 1. Muat 70 Gunungapi Nasional dari Backend (PVMBG)
    api.getNationalVolcanoes()
      .then((geo) => {
        const features = geo?.features || [];
        const groups: Record<string, any[]> = {
          "Sumatera": [],
          "Jawa": [],
          "Bali & Nusa Tenggara": [],
          "Sulawesi": [],
          "Maluku & Papua": []
        };
        features.forEach((f: any) => {
          const reg = f.properties?.region || "Lainnya";
          if (!groups[reg]) groups[reg] = [];
          groups[reg].push(f);
        });
        setVolcanoGroups(groups);
      })
      .catch((err) => console.error("Gagal memuat katalog gunung:", err));

    // 2. Muat 36 Kawasan Hutan & Gambut dari Backend
    api.getNationalForests()
      .then((forests) => {
        const list = Array.isArray(forests) ? forests : (forests?.forests || []);
        const groups: Record<string, any[]> = {
          "Sumatera": [],
          "Kalimantan": [],
          "Jawa": [],
          "Bali & Nusa Tenggara": [],
          "Sulawesi": [],
          "Maluku & Papua": []
        };
        list.forEach((k: any) => {
          const reg = k.region || "Lainnya";
          if (!groups[reg]) groups[reg] = [];
          groups[reg].push(k);
        });
        setForestGroups(groups);
      })
      .catch((err) => console.error("Gagal memuat katalog hutan:", err));
  }, []);

  return (
    <div
      className="absolute top-16 sm:top-20 left-2 sm:left-4 w-[calc(100%-1rem)] sm:w-80 max-w-sm max-h-[calc(100vh-140px)] aurora-glass-card rounded-2xl shadow-2xl z-[1000] flex flex-col overflow-hidden transition-all duration-300 text-slate-100"
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
            <span className="font-extrabold text-xs block text-white">Pusat Kendali Simulasi</span>
            <span className="text-[10px] font-medium text-slate-400">Model Lagrangian RK2 (15 Ansambel)</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isCollapsed && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-rose-600 text-white animate-pulse sm:hidden">
              Buka
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1.5 rounded-lg transition cursor-pointer hover:bg-white/10 text-slate-300"
            title={isCollapsed ? "Buka Panel" : "Ciutkan Panel"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Dock */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-3 overflow-y-auto max-h-[calc(100vh-210px)]">
          {/* Pilihan Bahaya */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 text-slate-300">
              Jenis Bahaya Atmosfer:
            </label>
            <select
              value={hazard}
              onChange={(e) => onHazardChange(e.target.value as HazardType)}
              className="w-full rounded-xl px-3 py-2 text-xs outline-none transition font-medium bg-black/40 border border-white/15 text-white shadow-xs focus:border-purple-400"
            >
              <option value="volcano">🌋 Erupsi Gunung Api (Abu Vulkanik)</option>
              <option value="fire">🔥 Karhutla Gambut (Asap PM2.5)</option>
            </select>
          </div>

          {/* Pilihan Kejadian */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 text-slate-300">
              Lokasi Kejadian (Nasional):
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
                      <optgroup key={reg} label={`Gunung Api ${reg} (${list.length})`} className="bg-slate-900 text-white">
                        {list.map((f) => {
                          const p = f.properties || f;
                          const id = p.event_id || p.id;
                          const lvlName = p.level_name ? p.level_name.split(' ')[0] + ' ' + (p.level_name.split(' ')[1] || '') : `Level ${p.level || 1}`;
                          return (
                            <option key={id} value={id}>
                              {`[${lvlName}] ${p.name} (${p.province}) - ${p.elevation_m}m`}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })
                ) : (
                  <optgroup label="Gunungapi Aktif PVMBG" className="bg-slate-900 text-white">
                    <option value="anak_krakatau_2026_09">[Level III] G. Anak Krakatau (Selat Sunda)</option>
                    <option value="merapi_yogyakarta">[Level III] G. Merapi (Jawa Tengah / DIY)</option>
                    <option value="lewotobi_laki_laki">[Level IV] G. Lewotobi Laki-laki (NTT)</option>
                    <option value="marapi_sumatera">[Level III] G. Marapi (Sumatera Barat)</option>
                    <option value="semeru">[Level III] G. Semeru (Jawa Timur)</option>
                    <option value="agung">[Level II] G. Agung (Bali)</option>
                    <option value="rinjani">[Level II] G. Rinjani (Lombok, NTB)</option>
                    <option value="sinabung">[Level II] G. Sinabung (Sumatera Utara)</option>
                  </optgroup>
                )
              ) : (
                Object.keys(forestGroups).length > 0 ? (
                  Object.entries(forestGroups).map(([reg, list]) => {
                    if (list.length === 0) return null;
                    return (
                      <optgroup key={reg} label={`Kawasan Hutan ${reg} (${list.length})`} className="bg-slate-900 text-white">
                        {list.map((k) => (
                          <option key={k.id} value={k.id}>
                            {`[${k.risk_level || 'Rawan'}] ${k.name} - ${k.forest_type}`}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })
                ) : (
                  <optgroup label="Kebakaran Hutan &amp; Lahan Gambut" className="bg-slate-900 text-white">
                    <option value="hutan_sebangau">[Sangat Rawan] TN Sebangau - Hutan Rawa Gambut Tropis</option>
                    <option value="hutan_eks_plg">[Sangat Rawan] KHG Eks-PLG Sejuta Ha - Gambut Kritis</option>
                    <option value="live_kalimantan">Karhutla Gambut Kalimantan (NASA FIRMS Live)</option>
                  </optgroup>
                )
              )}
            </select>
          </div>

          {/* Switcher Mode */}
          <div>
            <label className="block text-[11px] font-bold mb-1.5 text-slate-300">
              Mode Pemodelan:
            </label>
            <div
              className="grid grid-cols-2 rounded-xl p-1 text-center text-xs bg-black/40 border border-white/10 shadow-xs"
            >
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
                Otomatis (Data Nyata)
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
                Coba-coba (What-If)
              </button>
            </div>
          </div>

          {/* Parameter Eksperimen */}
          {mode === "experiment" && (
            <div
              className="rounded-xl p-3 space-y-2.5 text-xs bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Parameter What-If Skenario</span>
              </div>

              {hazard === "volcano" ? (
                <div>
                  <label className="text-[10px] font-medium block mb-1 text-slate-300">
                    Tinggi Kolom (km di atas kawah):
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
                    Skala Daya Panas Api (FRP %): {overrides.frp_scale ? overrides.frp_scale * 100 : 100}%
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
                  <span>Balikkan Arah Angin Troposfer (180°)</span>
                </label>
              </div>

              <div>
                <label className="text-[10px] font-medium block mb-1 text-slate-300">
                  Curah Hujan Pencuci (mm/jam):
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

          {/* Tombol Eksekusi Utama (Get Started Style Aurora Gradient Pill) */}
          <button
            onClick={onRunSimulation}
            disabled={isRunning}
            className="w-full py-3 px-4 aurora-pill aurora-btn font-extrabold text-xs tracking-wide flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 text-white shadow-xl active:scale-98"
          >
            <Zap className={`w-4 h-4 text-emerald-400 ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "MENGHITUNG SEBARAN..." : "JALANKAN SIMULASI SEBARAN"}</span>
          </button>

          {/* Action Row */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={onRunDemo}
              disabled={isRunning}
              className="py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer aurora-btn text-white shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
              <span>Putar Demo</span>
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
              <span>Ekspor Laporan</span>
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


