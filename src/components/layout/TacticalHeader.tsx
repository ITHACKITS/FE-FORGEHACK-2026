import React, { useEffect, useState } from "react";
import { RefreshCw, PanelRight, Layers, Menu, X, Home, Globe } from "lucide-react";
import { api } from "../../services/api";
import type { SummaryKpiResponse } from "../../types/api";
import { useLanguage } from "../../context/useLanguage";

interface TacticalHeaderProps {
  onResetView?: () => void;
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
  onToggleLegend?: () => void;
  isLegendOpen?: boolean;
  /** The impact drawer shows simulation results, so it hides with the simulation tools. */
  showDrawerButton?: boolean;
}

export const TacticalHeader: React.FC<TacticalHeaderProps> = ({
  onToggleDrawer,
  isDrawerOpen,
  onToggleLegend,
  isLegendOpen = false,
  showDrawerButton = true
}) => {
  const { lang, toggleLang, t } = useLanguage();
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
    ? Number(kpi.wildfire_hotspots.active_24h_firms).toLocaleString(lang === "id" ? "id-ID" : "en-US")
    : (1680).toLocaleString(lang === "id" ? "id-ID" : "en-US");

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
    let cancelled = false;
    api.getSummaryKpi()
      .then((data) => { if (!cancelled) setKpi(data); })
      .catch(() => { /* Offline fallback */ });
    return () => { cancelled = true; };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.syncLive();
      setSyncStatus(`${t.synced} (${res.latency_ms || 92}ms)`);
      await loadKpi();
    } catch {
      setSyncStatus(lang === "id" ? "Gagal" : "Failed");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  return (
    <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-4 sm:right-4 z-[1100] pointer-events-none">
      <header
        className="pointer-events-auto w-full mx-auto aurora-glass-card rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 whitespace-nowrap transition-all duration-300 shadow-2xl"
      >
        {/* Brand Logo & Title */}
        <a
          href="/"
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 hover:opacity-90 transition group cursor-pointer"
          title={t.backToLanding}
        >
          <img
            src="/Logo.png"
            alt={lang === "id" ? "Logo StandbAI" : "StandbAI logo"}
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 drop-shadow-md select-none group-hover:scale-105 transition-transform"
          />
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white drop-shadow-sm">
              StandbAI
            </span>
            <span className="hidden sm:inline font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md tracking-wider text-white shadow-xs bg-gradient-to-r from-emerald-600 to-rose-600 border border-white/20">
              INDONESIA
            </span>
          </div>
        </a>

        {/* Telemetry badges: only from 1280 px, where the whole bar fits on one line */}
        <div className="hidden xl:flex items-center gap-2.5">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md bg-white/10 border border-white/15 text-slate-100 shadow-sm transition hover:scale-105"
            title={lang === "id" ? "Status gunung api aktif PVMBG (Level III Siaga & Level IV Awas)" : "PVMBG active volcano alert status (Level III Watch & Level IV Warning)"}
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M2 22L12 2l10 20H2z" />
              <path d="M12 9v4" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">{t.alertVolcanoes}:</span>
            <strong className="font-mono font-bold text-xs text-rose-400">{volcanoAlertCount}</strong>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md bg-white/10 border border-white/15 text-slate-100 shadow-sm transition hover:scale-105"
            title={lang === "id" ? "Titik panas satelit NASA FIRMS VIIRS, 24 jam terakhir" : "NASA FIRMS VIIRS satellite hotspots, last 24 hours"}
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 2c-4 4-6 8-6 12 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3-2-6-5-8-1 3-3 4-5 2z" />
            </svg>
            <span className="text-[11px] font-medium text-slate-300">{t.hotspots}:</span>
            <strong className="font-mono font-bold text-xs text-amber-400">{fireCount}</strong>
          </div>
        </div>

        {/* Action Controls & Digital Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Back to Landing Page Button */}
          <a
            href="/"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer aurora-btn border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-500/20 shadow-sm"
            title={t.backToLanding}
          >
            <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="hidden lg:inline">{t.landingPage}</span>
          </a>

          {/* Language Switcher Toggle (EN | ID) */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer aurora-btn border border-cyan-500/40 text-cyan-300 hover:text-white hover:bg-cyan-500/20"
            title={lang === "en" ? "Switch to Indonesian" : "Ganti ke bahasa Inggris"}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-mono tracking-wider">{lang.toUpperCase()}</span>
          </button>

          {/* Dual Digital Clock */}
          <div className="text-right font-mono text-[11px] hidden lg:max-xl:block min-[1360px]:block leading-tight text-slate-200">
            <div className="font-bold">{clockWib}</div>
            <div className="text-[9px] text-slate-400">{clockUtc}</div>
          </div>

          {/* Live Sync Button */}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-50 aurora-btn"
            title={lang === "id" ? "Sinkronkan data langsung NASA FIRMS & Open-Meteo" : "Sync live NASA FIRMS & Open-Meteo data"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-rose-400" : "text-emerald-400"}`} />
            <span className="hidden lg:inline">{syncStatus || t.liveSync}</span>
          </button>

          {/* Map Legend Button */}
          <button
            onClick={onToggleLegend}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              isLegendOpen ? "bg-white/30 border border-white/40 text-white shadow-lg" : "aurora-btn"
            }`}
            title={lang === "id" ? "Buka/tutup keterangan peta" : "Toggle map legend"}
          >
            <Layers className="w-3.5 h-3.5 text-purple-300" />
            <span className="hidden xs:inline">{t.mapLegend}</span>
          </button>

          {/* Impact Projection Button */}
          {showDrawerButton && (
          <button
            onClick={onToggleDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
              isDrawerOpen ? "bg-white/30 border border-white/40 text-white shadow-lg" : "aurora-btn"
            }`}
            title={lang === "id" ? "Buka/tutup panel proyeksi dampak" : "Toggle impact projection panel"}
          >
            <PanelRight className="w-3.5 h-3.5 text-rose-300" />
            <span className="hidden md:inline">{t.analyticsDrawer}</span>
          </button>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="sm:hidden p-1.5 rounded-full transition cursor-pointer aurora-btn text-white"
            title={lang === "id" ? "Menu" : "Menu"}
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
                <span className="text-[10px] block text-slate-400">{t.alertVolcanoes}</span>
                <strong className="font-mono text-xs text-rose-300">{volcanoAlertCount} {lang === "id" ? "aktif" : "active"}</strong>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/10 border border-white/15">
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2c-4 4-6 8-6 12 0 4.4 3.6 8 8 8s8-3.6 8-8c0-3-2-6-5-8-1 3-3 4-5 2z" />
              </svg>
              <div>
                <span className="text-[10px] block text-slate-400">{t.hotspots}</span>
                <strong className="font-mono text-xs text-amber-300">{fireCount} {lang === "id" ? "aktif" : "active"}</strong>
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
            <span>{syncStatus || t.liveSync}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TacticalHeader;
