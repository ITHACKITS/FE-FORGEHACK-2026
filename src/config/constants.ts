/**
 * config/constants.ts - Konstanta Konfigurasi Global Aplikasi UdaraSiaga
 */

export const CONFIG = {
  // Backend base URL: VITE_API_BASE_URL at build time (e.g. the Cloud Run URL), else the
  // local dev server on port 8000. FE-03.
  API_BASE: ((import.meta.env.VITE_API_BASE_URL as string | undefined) || "").replace(/\/+$/, "") ||
    (typeof window !== "undefined" && window.location.port === "8000"
      ? window.location.origin
      : "http://127.0.0.1:8000"),

  // Google Maps Platform API Key (used for 3D Map3D element & Street View)
  GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string ?? "",

  // Feature flags. The Google Maps 3D view is kept in code but hidden: it is unverified,
  // needs a billed Maps key and its CSS tilt broke map click hit-testing (PRD FE-10).
  FEATURES: {
    MAP_3D: false
  },

  DEFAULT_MAP_VIEW: {
    lat: -2.5,
    lng: 118.0,
    zoom: 5,
    minZoom: 4,
    maxZoom: 17
  },

  COLORS: {
    volcano: {
      p90: "#991b1b", // Abu Tebal (Konsentrasi Tinggi)
      p50: "#dc2626", // Abu Sedang
      p05: "#f87171", // Debu Halus
      label: "Sebaran Abu Vulkanik"
    },
    fire: {
      p90: "#78350f", // Asap Sangat Pekat
      p50: "#b45309", // Asap Sedang
      p05: "#f59e0b", // Asap Tipis
      label: "Sebaran Asap Karhutla (PM2.5)"
    },
    pvmbg: {
      level4: { color: "#ef4444", name: "Level IV (Awas)" },
      level3: { color: "#f97316", name: "Level III (Siaga)" },
      level2: { color: "#eab308", name: "Level II (Waspada)" },
      level1: { color: "#22c55e", name: "Level I (Normal)" }
    }
  }
} as const;
