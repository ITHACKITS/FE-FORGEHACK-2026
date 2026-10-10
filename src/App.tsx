import React, { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { TacticalHeader } from "./components/layout/TacticalHeader";
import { ControllerDock } from "./components/layout/ControllerDock";
import { MapWorkspace } from "./components/layout/MapWorkspace";
import { TimelinePlayer } from "./components/layout/TimelinePlayer";
import { AnalyticsDrawer } from "./components/layout/AnalyticsDrawer";
import { LegendModal } from "./components/layout/LegendModal";
import { api } from "./services/api";
import { useLanguage } from "./context/useLanguage";
import { forestName, volcanoName } from "./utils/apiLabels";
import { buildSmokeScenario } from "./simulation/smokeScenarios";
import type {
  HazardType,
  ModelingMode,
  SimulationOverrides,
  SimulationPayload,
  ImpactResponse,
  ValidationResponse
} from "./types/api";

/** A status message in both languages, so it follows a language switch while shown. */
type Bilingual = { en: string; id: string };

/** Demo narration per forecast hour, written here so it exists in both languages. */
function demoCommentary(hour: number, hazard: HazardType): Bilingual {
  const hh = String(hour).padStart(2, "0");
  if (hazard === "volcano") {
    return hour === 0
      ? { en: `T + ${hh} h: the initial eruption phase begins at the crater.`, id: `T + ${hh} jam: fase awal erupsi dimulai di kawah.` }
      : {
          en: `T + ${hh} h: the ash cloud has spread ~${hour * 15} km on upper-troposphere winds.`,
          id: `T + ${hh} jam: awan abu telah menyebar sekitar ${hour * 15} km terbawa angin troposfer atas.`
        };
  }
  return hour === 0
    ? { en: `T + ${hh} h: first detection of a cluster of fire hotspots.`, id: `T + ${hh} jam: deteksi pertama klaster titik api.` }
    : {
        en: `T + ${hh} h: the smoke plume covers ~${(hour * 25).toLocaleString("en-US")} km², which may reduce visibility.`,
        id: `T + ${hh} jam: sebaran asap mencakup sekitar ${(hour * 25).toLocaleString("id-ID")} km² dan dapat mengurangi jarak pandang.`
      };
}

export const App: React.FC = () => {
  const { lang } = useLanguage();
  const [hazard, setHazard] = useState<HazardType>("volcano");
  const [eventId, setEventId] = useState<string>("anak_krakatau_2026_09");
  const [mode, setMode] = useState<ModelingMode>("auto");
  const [overrides, setOverrides] = useState<SimulationOverrides>({
    column_height_km: 12.0,
    frp_scale: 1.0,
    wind_reverse_troposphere: false,
    rain_scavenging_mm_h: 0
  });

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [currentHour, setCurrentHour] = useState<number>(0);
  const [hourlyTiersCache, setHourlyTiersCache] = useState<Record<string | number, any> | null>(null);

  const [impactData, setImpactData] = useState<ImpactResponse | null>(null);
  const [validationData, setValidationData] = useState<ValidationResponse | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  // Simulation and experiment tools stay hidden for demos; a small icon button brings them back.
  const [showSimTools, setShowSimTools] = useState<boolean>(false);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<Bilingual | null>(null);
  const progressText = progress ? progress[lang] : "";

  const [resetViewTrigger, setResetViewTrigger] = useState<number>(0);

  // Ambil poligon sebaran jam tertentu saat activeRunId aktif atau currentHour berubah
  React.useEffect(() => {
    if (!activeRunId) return;
    if (hourlyTiersCache && hourlyTiersCache[currentHour]) return;

    api.getTiersAtHour(activeRunId, currentHour)
      .then((geo) => {
        setHourlyTiersCache((prev) => ({
          ...(prev || {}),
          [currentHour]: geo
        }));
      })
      .catch((err) => console.error("Failed to load plume tiers for hour", currentHour, err));
  }, [activeRunId, currentHour, hourlyTiersCache]);

  const handleHazardChange = (newHazard: HazardType) => {
    setHazard(newHazard);
    if (newHazard === "fire" && !eventId.startsWith("hutan_")) {
      setEventId("hutan_sebangau");
    } else if (newHazard === "volcano" && (eventId.startsWith("hutan_") || eventId === "live_kalimantan")) {
      setEventId("anak_krakatau_2026_09");
    }
  };

  const [simulatedEvent, setSimulatedEvent] = useState<{ id: string; hazard: HazardType }>({ id: "anak_krakatau_2026_09", hazard: "volcano" });
  const demoIntervalRef = React.useRef<any>(null);

  // Event names for the "active simulation" pill: volcano and forest catalogues (cached by api.ts).
  const [catalog, setCatalog] = useState<Record<string, string>>({});
  React.useEffect(() => {
    let cancelled = false;
    Promise.all([api.getNationalVolcanoes().catch(() => null), api.getNationalForests().catch(() => null)]).then(([v, f]) => {
      if (cancelled) return;
      const names: Record<string, string> = {};
      for (const feat of v?.features || []) {
        const p = feat.properties || {};
        names[p.event_id || p.id] = p.name;
      }
      for (const k of Array.isArray(f) ? f : f?.forests || []) names[k.id] = k.name;
      setCatalog(names);
    });
    return () => { cancelled = true; };
  }, []);
  const eventLabel = (id: string, hz: HazardType) => {
    const name = catalog[id] ?? buildSmokeScenario(hz, id, null).label;
    return hz === "volcano" ? volcanoName(name, lang) : forestName(name, lang);
  };

  const handleRunSimulation = async (targetHazard?: HazardType, targetEventId?: string) => {
    const activeHazard = targetHazard || hazard;
    const activeEventId = targetEventId || eventId;

    if (targetHazard) setHazard(targetHazard);
    if (targetEventId) setEventId(targetEventId);

    setIsRunning(true);
    setProgress({ en: "Computing atmospheric advection for 15 ensemble members (RK2)...", id: "Menghitung adveksi atmosferik 15 anggota ensemble (RK2)..." });

    // Samakan konstruksi overrides dengan standar backend (hanya mode experiment)
    let backendOverrides: Record<string, any> | null = null;
    if (mode === "experiment") {
      backendOverrides = {};
      if (activeHazard === "volcano" && overrides.column_height_km) {
        backendOverrides.column_height_km = overrides.column_height_km;
      }
      if (overrides.wind_reverse_troposphere) {
        backendOverrides.wind = { reverse: true };
      }
      const rainMm = overrides.rain_scavenging_mm_h ?? 0;
      if (rainMm > 0) {
        backendOverrides.rain = { intensity_mm_h: rainMm, duration_h: 6, start_h: 4 };
      }
      if (activeHazard === "fire" && overrides.frp_scale !== undefined) {
        backendOverrides.hotspots = { frp_scale: overrides.frp_scale };
      }
    }

    const payload: SimulationPayload = {
      hazard: activeHazard,
      mode,
      source: { event_id: activeEventId },
      horizon_hours: 48,
      n_members: 15,
      seed: 42,
      thresholds: { min: 0.9, mid: 0.5, max: 0.05 },
      overrides: backendOverrides
    };

    try {
      const simRes = await api.runSimulation(payload);
      const runId = simRes.run_id;
      setActiveRunId(runId);
      setSimulatedEvent({ id: activeEventId, hazard: activeHazard });

      setProgress({ en: "Extracting plume contours and population impact...", id: "Mengekstrak kontur poligon & dampak populasi..." });

      // Set pratinjau jam ke 12 agar poligon sebaran langsung terlihat di peta (sesuai fe-dummy)
      setCurrentHour(12);

      const [impact, validation, tier12] = await Promise.all([
        api.getImpact(runId).catch(() => null),
        api.getValidation(activeEventId).catch(() => null),
        api.getTiersAtHour(runId, 12).catch(() => null)
      ]);

      if (tier12) {
        setHourlyTiersCache({ 12: tier12 });
      }

      setImpactData(impact);
      setValidationData(validation);
      setIsDrawerOpen(true);
      setProgress(mode === "experiment"
        ? { en: "Done: hypothetical scenario, 15 ensemble members", id: "Selesai: skenario hipotetis, 15 anggota ensemble" }
        : { en: "Done: observed event, 15 ensemble members", id: "Selesai: kejadian observasi, 15 anggota ensemble" });
    } catch (err: any) {
      setProgress({ en: `Failed: ${err.message || "server offline"}`, id: `Gagal: ${err.message || "server tidak tersedia"}` });
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(null), 4000);
    }
  };

  const handleRunDemo = async () => {
    setIsRunning(true);
    setProgress({ en: "Starting the automatic demo...", id: "Memulai putar demo otomatis..." });

    try {
      const demo = await api.playDemo(eventId).catch(() => null);
      if (demo && demo.steps && demo.steps.length > 0) {
        if (!activeRunId) {
          await handleRunSimulation(hazard, eventId);
        }

        let stepIdx = 0;
        if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);

        demoIntervalRef.current = setInterval(() => {
          if (stepIdx >= demo.steps.length) {
            clearInterval(demoIntervalRef.current);
            demoIntervalRef.current = null;
            setProgress({ en: "Finished playing the demo scenario.", id: "Selesai memutar demo skenario." });
            setTimeout(() => setProgress(null), 3000);
            return;
          }

          const step = demo.steps[stepIdx];
          setCurrentHour(step.hour);
          setProgress(demoCommentary(step.hour, hazard));
          stepIdx++;
        }, 1200);
      } else {
        await handleRunSimulation(hazard, eventId);
      }
    } catch {
      await handleRunSimulation(hazard, eventId);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080c0e] text-slate-100 font-sans">
      {/* Zona A: Tactical Header */}
      <TacticalHeader
        onResetView={() => setResetViewTrigger((t) => t + 1)}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
        onToggleLegend={() => setIsLegendOpen((prev) => !prev)}
        isLegendOpen={isLegendOpen}
        showDrawerButton={showSimTools}
      />

      {/* Main Workspace (Zona B, C, dan D) */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Zona C: Peta Leaflet Full Canvas */}
        <MapWorkspace
          hazard={hazard}
          eventId={eventId}
          currentHour={currentHour}
          hourlyTiersCache={hourlyTiersCache}
          onSelectEvent={(newId) => {
            // Forest ids start with "hutan_"; clicking one switches the hazard to fire.
            setHazard(newId.startsWith("hutan_") ? "fire" : "volcano");
            setEventId(newId);
          }}
          resetViewTrigger={resetViewTrigger}
          onToggleLegend={() => setIsLegendOpen((prev) => !prev)}
          smokeOverrides={mode === "experiment" ? overrides : null}
          simTools={showSimTools}
        />

        {/* Floating Active Simulation Pill */}
        {showSimTools && activeRunId && (
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-full px-3.5 py-1 z-[1000] text-xs flex items-center gap-2 shadow-xl pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">{lang === "id" ? "Simulasi aktif:" : "Active simulation:"}</span>
            <strong className="text-white font-semibold">{eventLabel(simulatedEvent.id, simulatedEvent.hazard)}</strong>
            <span className="text-sky-400 font-mono text-[11px]">(T+{currentHour}:00)</span>
          </div>
        )}

        {/* Small icon-only switch for the simulation tools (no visible text, so it stays out of demos) */}
        <button
          type="button"
          onClick={() => setShowSimTools((v) => !v)}
          aria-pressed={showSimTools}
          aria-label={lang === "id"
            ? (showSimTools ? "Sembunyikan alat simulasi" : "Tampilkan alat simulasi")
            : (showSimTools ? "Hide simulation tools" : "Show simulation tools")}
          className={`absolute top-16 sm:top-20 left-2 sm:left-4 z-[1001] w-7 h-7 rounded-full flex items-center justify-center aurora-glass-card border border-white/15 transition cursor-pointer hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-emerald-300 ${
            showSimTools ? "opacity-100 text-emerald-300" : "opacity-40 text-slate-300"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        {/* Zona B: Floating Controller Melayang di Kiri Atas Peta */}
        {showSimTools && (
        <ControllerDock
          hazard={hazard}
          onHazardChange={handleHazardChange}
          eventId={eventId}
          onEventChange={setEventId}
          mode={mode}
          onModeChange={setMode}
          overrides={overrides}
          onOverridesChange={setOverrides}
          onRunSimulation={handleRunSimulation}
          onRunDemo={handleRunDemo}
          isRunning={isRunning}
          progressText={progressText}
          activeRunId={activeRunId}
          topClass="top-[6.25rem] sm:top-[7.25rem]"
        />
        )}

        {/* Zona C: Timeline Player Melayang di Bawah Peta */}
        {showSimTools && (
          <TimelinePlayer
            currentHour={currentHour}
            onHourChange={setCurrentHour}
          />
        )}

        {/* Zona D: Tabbed Inspection Dock Melayang di Kanan */}
        <AnalyticsDrawer
          isOpen={showSimTools && isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          impact={impactData}
          validation={validationData}
          hazard={hazard}
          rainMm={mode === "experiment" ? overrides.rain_scavenging_mm_h ?? 0 : 0}
        />

        {/* Modal Legenda Otoritatif PVMBG & Dispersi */}
        <LegendModal
          isOpen={isLegendOpen}
          onClose={() => setIsLegendOpen(false)}
        />
      </div>
    </div>
  );
};

export default App;
