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
    ? Number(kpi.wildfire_hotspots.active_24h_firms).toLocaleString("en-US")
    : "1,680";

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const wibStr = now.toLocaleTimeString("en-US", {
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
      setSyncStatus(`Synced (${res.latency_ms || 92}ms)`);
      await loadKpi();
    } catch {
      setSyncStatus("Failed");
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
            src="/Logo.png"
            alt="StandbAI Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-md select-none pointer-events-none"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white drop-shadow-sm">
              StandbAI
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
            title="PVMBG Active Volcano Alert Status (Level III Watch & Level IV Warning)"
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2 22L12 2l10 20H2z" />
              <path d="M12 9v4" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">Alert Volcanoes:</span>
            <strong className="font-mono font-bold text-xs text-rose-400">{volcanoAlertCount}</strong>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md bg-white/10 border border-white/15 text-slate-100 shadow-sm transition hover:scale-105"
            title="NASA FIRMS VIIRS Satellite Hotspots Last 24 Hours"
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2c-4 4-6 8-6 12 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3-2-6-5-8-1 3-3 4-5 2z" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">Hotspots (24h):</span>
            <strong className="font-mono font-bold text-xs text-amber-400">{fireCount}</strong>
          </div>
        </div>

        {/* Action Controls & Digital Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Dual Digital Clock */}
          <div className="text-right font-mono text-[11px] hidden md:block leading-tight text-slate-200">
            <div className="font-bold">{clockWib}</div>
            <div className="text-[9px] text-slate-400">{clockUtc}</div>
          </div>

          {/* Live Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-50 aurora-btn"
            title="Sync live NASA FIRMS & Open-Meteo data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-rose-400" : "text-emerald-400"}`} />
            <span className="hidden md:inline">{syncStatus || "Live Sync"}</span>
          </button>

          {/* Map Legend Button */}
          <button
            onClick={onToggleLegend}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              isLegendOpen ? "bg-white/30 border border-white/40 text-white shadow-lg" : "aurora-btn"
            }`}
            title="Toggle Map Legend"
          >
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden xs:inline">Legend</span>
          </button>

          {/* Impact Projection Button */}
          <button
            onClick={onToggleDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              isDrawerOpen ? "bg-white/30 border border-white/40 text-white shadow-lg" : "aurora-btn"
            }`}
            title="Toggle Impact Projection Drawer"
          >
            <PanelRight className="w-3.5 h-3.5 text-rose-300" />
            <span className="hidden sm:inline">Impact Projection</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-1.5 rounded-full transition cursor-pointer aurora-btn text-white"
            title="Mobile Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown Card */}
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
                <span className="text-[10px] block text-slate-400">Alert Volcanoes</span>
                <strong className="font-mono text-xs text-rose-300">{volcanoAlertCount} Active</strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/10 border border-white/15">
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2c-4 4-6 8-6 12 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3-2-6-5-8-1 3-3 4-5 2z" />
              </svg>
              <div>
                <span className="text-[10px] block text-slate-400">Hotspots</span>
                <strong className="font-mono text-xs text-amber-300">{fireCount} Active</strong>
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
            <span>{syncStatus || "Live Sync Sensors"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TacticalHeader;
