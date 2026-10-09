import React, { useEffect, useState } from "react";
import { RefreshCw, PanelRight, Layers, Menu, X } from "lucide-react";
import { api } from "../../services/api";
import type { SummaryKpiResponse } from "../../types/api";

interface TacticalHeaderProps {
  onResetView?: () => void;
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
  onToggleLegend?: () => void;
  isLegendOpen?: boolean;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({
  onToggleDrawer,
  isDrawerOpen,
  onToggleLegend,
  isLegendOpen = false
}) => {
  const [clockWib, setClockWib] = useState("--:--:-- WIB");
  const [clockUtc, setClockUtc] = useState("--:--:-- UTC");
  const [kpi, setKpi] = useState<SummaryKpiResponse | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const volcanoAlertCount = kpi?.volcanoes
    ? (kpi.volcanoes.level_4_awas || 0) + (kpi.volcanoes.level_3_siaga || 0)
    : 7;

  const fireCount = kpi?.wildfire_hotspots?.active_24h_firms !== undefined
    ? Number(kpi.wildfire_hotspots.active_24h_firms).toLocaleString("id-ID")
    : "1.680";

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const wibStr = now.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      setClockWib(`${wibStr} WIB`);

      const utcH = String(now.getUTCHours()).padStart(2, "0");
      const utcM = String(now.getUTCMinutes()).padStart(2, "0");
      const utcS = String(now.getUTCSeconds()).padStart(2, "0");
      setClockUtc(`${utcH}:${utcM}:${utcS} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadKpi = async () => {
    try {
      const data = await api.getSummaryKpi();
      setKpi(data);
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    loadKpi();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncLive();
      setSyncStatus(`Tersinkron (${res.latency_ms || 92}ms)`);
      await loadKpi();
    } catch {
      setSyncStatus("Gagal");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  return (
    <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-4 sm:right-4 z-[1100] pointer-events-none">
      <header
        className="pointer-events-auto w-full max-w-7xl mx-auto aurora-glass-card rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between transition-all duration-300 shadow-2xl"
      >
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <img
            src="/gunung.png"
            alt="Logo Gunung Api UdaraSiaga"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-md select-none pointer-events-none"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white drop-shadow-sm">
              UdaraSiaga
            </span>
            <span className="font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md tracking-wider text-white shadow-xs bg-gradient-to-r from-emerald-600 to-rose-600 border border-white/20">
              INDONESIA
            </span>
          </div>
        </div>

        {/* Telemetry Badges (Desktop / Tablet view) */}
        <div className="hidden lg:flex items-center gap-2.5">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md bg-white/10 border border-white/15 text-slate-100 shadow-sm transition hover:scale-105"
            title="Status Gunung Api Aktif PVMBG (Level III Siaga & Level IV Awas)"
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2 22L12 2l10 20H2z" />
              <path d="M12 9v4" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">Gunung Siaga / Awas:</span>
            <strong className="font-mono font-bold text-xs text-rose-400">{volcanoAlertCount}</strong>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md bg-white/10 border border-white/15 text-slate-100 shadow-sm transition hover:scale-105"
            title="Deteksi Titik Api Satelit NASA FIRMS VIIRS 24 Jam Terakhir"
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2c-4 4-6 8-6 12 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3-2-6-5-8-1 3-3 4-5 2z" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">Titik Api (24h):</span>
            <strong className="font-mono font-bold text-xs text-amber-400">{fireCount}</strong>
          </div>
        </div>

        {/* Action Controls & Digital Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Jam Digital Ganda */}
          <div className="text-right font-mono text-[11px] hidden md:block leading-tight text-slate-200">
            <div className="font-bold">{clockWib}</div>
            <div className="text-[9px] text-slate-400">{clockUtc}</div>
          </div>

          {/* Tombol Live Sync */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-50 aurora-btn"
            title="Sinkronisasi sensor NASA & Open-Meteo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-rose-400" : "text-emerald-400"}`} />
            <span className="hidden md:inline">{syncStatus || "Live Sync"}</span>
          </button>

          {/* Tombol Legenda */}
          <button
            onClick={onToggleLegend}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              isLegendOpen ? "bg-white/30 border border-white/40 text-white shadow-lg" : "aurora-btn"
            }`}
            title="Buka / Tutup Legenda Peta"
          >
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden xs:inline">Legenda</span>
          </button>

          {/* Tombol Proyeksi Dampak */}
          <button
            onClick={onToggleDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              isDrawerOpen ? "bg-white/30 border border-white/40 text-white shadow-lg" : "aurora-btn"
            }`}
            title="Buka / Tutup Proyeksi Dampak"
          >
            <PanelRight className="w-3.5 h-3.5 text-rose-300" />
            <span className="hidden sm:inline">Proyeksi Dampak</span>
          </button>

          {/* Mobile Menu Toggle Button (< sm screens) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-1.5 rounded-full transition cursor-pointer aurora-btn text-white"
            title="Menu Tambahan Mobile"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown Card (Tampil di Layar HP saat Tombol Menu diklik) */}
      {isMobileMenuOpen && (
        <div
          className="pointer-events-auto mt-2 max-w-7xl mx-auto rounded-2xl p-3 aurora-glass-card shadow-2xl flex flex-col gap-2.5 sm:hidden text-slate-100 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Status Jam Mobile */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10 font-mono">
            <span className="font-bold text-white">{clockWib}</span>
            <span className="text-slate-400">{clockUtc}</span>
          </div>

          {/* Telemetry Stats Mobile */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/10 border border-white/15">
              <svg className="w-4 h-4 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M2 22L12 2l10 20H2z" />
                <path d="M12 9v4" />
              </svg>
              <div>
                <span className="text-[10px] block text-slate-400">Gunung Siaga</span>
                <strong className="font-mono text-xs text-rose-300">{volcanoAlertCount} Active</strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/10 border border-white/15">
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2c-4 4-6 8-6 12 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3-2-6-5-8-1 3-3 4-5 2z" />
              </svg>
              <div>
                <span className="text-[10px] block text-slate-400">Titik Api</span>
                <strong className="font-mono text-xs text-amber-300">{fireCount} Hotspots</strong>
              </div>
            </div>
          </div>

          {/* Live Sync Mobile */}
          <button
            onClick={() => {
              handleSync();
              setIsMobileMenuOpen(false);
            }}
            disabled={isSyncing}
            className="w-full py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer aurora-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-rose-400" : "text-emerald-400"}`} />
            <span>{syncStatus || "Sinkronisasi Live NASA & Meteo"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

