export type Language = "en" | "id";

export const translations = {
  en: {
    // Header
    landingPage: "Landing Page",
    backToLanding: "Back to Landing Page",
    alertVolcanoes: "Alert Volcanoes",
    hotspots: "Hotspots (24h)",
    liveSync: "Live Sync",
    syncing: "Syncing...",
    synced: "Synced",
    mapLegend: "Legend",
    analyticsDrawer: "Impact Analytics",
    switchLanguage: "Bahasa Indonesia",
    langCode: "ID",
    
    // Controller Dock
    hazardType: "HAZARD TYPE",
    volcanoAsh: "Volcanic Ash",
    peatSmoke: "Peatland Smoke",
    modelingMode: "MODELING MODE",
    modeAuto: "Auto (Live Monitoring)",
    modeExperiment: "Scenario (Custom Inputs)",
    targetEvent: "TARGET EVENT",
    columnHeight: "Ash Column Height (km)",
    frpScale: "Fire Radiative Power (FRP Scale)",
    windReverse: "Reverse Wind Direction (180°)",
    rainScavenging: "Rain Scavenging (mm/h)",
    runSimulation: "Run Ensemble Simulation",
    runningSimulation: "Calculating Advection (RK2)...",
    
    // Map Workspace
    mapTitle: "Spatiotemporal Hazard Map",
    headingTilt: "3D View / Tilt & Rotate",
    resetView: "Reset View",
    myLocation: "My Location",
    streetView: "Street View",
    layerTiers: "Ash/Smoke Tiers",
    layerHotspots: "Hotspots",
    
    // Analytics Drawer Tabs
    tabImpact: "Impact Projection",
    tabHealth: "Health & Masks",
    tabScience: "Model Physics",
    
    // Drawer Content
    highAshZone: "90% Core Ash Zone",
    medAshZone: "50% Median Dispersion Zone",
    lowAshZone: "5% Max Reach Zone",
    exposedPop: "Exposed Population (P5–P95)",
    actionRecommended: "Recommended Mitigation Action",

    // Common
    close: "Close",
    details: "Details",
    select: "Select"
  },
  id: {
    // Header
    landingPage: "Halaman Utama",
    backToLanding: "Kembali ke Landing Page",
    alertVolcanoes: "Gunung Waspada/Siaga",
    hotspots: "Titik Panas (24j)",
    liveSync: "Sinkronkan Data Live",
    syncing: "Menyinkronkan...",
    synced: "Tersinkron",
    mapLegend: "Keterangan",
    analyticsDrawer: "Analisis Dampak",
    switchLanguage: "English",
    langCode: "EN",
    
    // Controller Dock
    hazardType: "JENIS BENCANA",
    volcanoAsh: "Abu Vulkanik",
    peatSmoke: "Asap Karhutla",
    modelingMode: "MODE PEMODELAN",
    modeAuto: "Otomatis (Data Resmi Live)",
    modeExperiment: "Skenario (Input Bebas)",
    targetEvent: "LOKASI / EVENT",
    columnHeight: "Tinggi Kolom Abu (km)",
    frpScale: "Skala Radiasi Api (FRP)",
    windReverse: "Pembalikan Arah Angin (180°)",
    rainScavenging: "Pencucian Hujan (mm/jam)",
    runSimulation: "Jalankan Simulasi Ensemble",
    runningSimulation: "Menghitung Adveksi (RK2)...",
    
    // Map Workspace
    mapTitle: "Peta Spasial Dampak",
    headingTilt: "Mode 3D / Rotasi & Kemiringan",
    resetView: "Reset Tampilan",
    myLocation: "Lokasi Saya",
    streetView: "Street View",
    layerTiers: "Zona Sebaran",
    layerHotspots: "Titik Panas",
    
    // Analytics Drawer Tabs
    tabImpact: "Proyeksi Dampak",
    tabHealth: "Kesehatan & Masker",
    tabScience: "Fisika Model",
    
    // Drawer Content
    highAshZone: "Zona Utama 90%",
    medAshZone: "Zona Median 50%",
    lowAshZone: "Zona Jangkauan 5%",
    exposedPop: "Populasi Terpapar (P5–P95)",
    actionRecommended: "Rekomendasi Tindakan Mitigasi",

    // Common
    close: "Tutup",
    details: "Detail",
    select: "Pilih"
  }
};
