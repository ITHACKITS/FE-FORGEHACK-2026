import React, { useState } from "react";
import { X, BarChart3, GraduationCap, Ambulance, ShieldAlert, FlaskConical } from "lucide-react";
import { TabImpact } from "../tabs/TabImpact";
import { TabSchools } from "../tabs/TabSchools";
import { TabEvac } from "../tabs/TabEvac";
import { TabHealth } from "../tabs/TabHealth";
import { TabScience } from "../tabs/TabScience";
import { useLanguage } from "../../context/useLanguage";
import type {
  ImpactResponse,
  FacilitiesImpactResponse,
  ValidationResponse,
  HazardType,
  SchoolItem
} from "../../types/api";

interface AnalyticsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  impact: ImpactResponse | null;
  facilities: FacilitiesImpactResponse | null;
  validation: ValidationResponse | null;
  hazard: HazardType;
  rainMm: number;
  onFlyTo: (lat: number, lng: number) => void;
  onDrawRoute: (s: SchoolItem) => void;
}

type TabType = "impact" | "schools" | "evac" | "health" | "science";

export const AnalyticsDrawer: React.FC<AnalyticsDrawerProps> = ({
  isOpen,
  onClose,
  impact,
  facilities,
  validation,
  hazard,
  rainMm,
  onFlyTo,
  onDrawRoute
}) => {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("impact");

  const tabs = [
    { id: "impact", label: lang === "id" ? "Dampak" : "Impact", icon: BarChart3 },
    { id: "schools", label: lang === "id" ? "Sekolah" : "Schools", icon: GraduationCap },
    { id: "evac", label: lang === "id" ? "Evakuasi" : "Evacuation", icon: Ambulance },
    { id: "health", label: lang === "id" ? "Kesehatan" : "PPE / Health", icon: ShieldAlert },
    { id: "science", label: lang === "id" ? "Sains" : "Science", icon: FlaskConical }
  ] as const;

  return (
    <aside
      className={`fixed sm:absolute top-16 right-2 sm:right-4 w-[calc(100%-1rem)] sm:w-[460px] max-w-full h-[calc(100vh-5rem)] max-h-[calc(100vh-5rem)] aurora-glass-card rounded-3xl border border-white/20 z-[1050] flex flex-col shadow-2xl transition-transform duration-300 ease-out text-slate-100 overflow-hidden ${
        isOpen ? "translate-x-0" : "translate-x-[120%]"
      }`}
    >
      {/* Drawer Header */}
      <div className="h-13 px-4 py-2.5 flex items-center justify-between shrink-0 bg-black/40 border-b border-white/10">
        <div>
          <span className="font-extrabold text-xs block text-white tracking-wide">
            {lang === "id" ? "Proyeksi Dampak & Aksi Dini" : "Impact Projection & Early Action"}
          </span>
          <span className="text-[10px] text-slate-400">
            {lang === "id" ? "Simulasi Ensemble Multi-Bahaya 48 Jam" : "48-Hour Multi-Hazard Ensemble Simulation"}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full transition cursor-pointer hover:bg-white/10 text-slate-300 hover:text-white"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 5 Tab Navigation */}
      <nav className="grid grid-cols-5 shrink-0 bg-black/30 border-b border-white/10">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`py-2.5 px-1 text-[10px] font-medium flex flex-col items-center gap-1 border-b-2 transition cursor-pointer ${
                isActive
                  ? "border-emerald-400 text-emerald-300 bg-emerald-500/15 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0f131a]/80">
        {activeTab === "impact" && (
          <TabImpact impact={impact} hazard={hazard} rainMm={rainMm} />
        )}
        {activeTab === "schools" && (
          <TabSchools
            schools={facilities?.schools || []}
            onFlyTo={onFlyTo}
            onDrawRoute={onDrawRoute}
          />
        )}
        {activeTab === "evac" && (
          <TabEvac
            healthcare={facilities?.evacuation_referral_hospitals || facilities?.hospitals || facilities?.healthcare || []}
            onFlyTo={onFlyTo}
          />
        )}
        {activeTab === "health" && <TabHealth hazard={hazard} />}
        {activeTab === "science" && <TabScience validation={validation} hazard={hazard} />}
      </div>
    </aside>
  );
};

export default AnalyticsDrawer;
