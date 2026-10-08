# 🌋 UdaraSiaga Indonesia — Frontend (React 19 + TypeScript + Vite + Tailwind v4)

**Platform Komando Pemodelan Dispersi Atmosfer Erupsi Vulkanik & Karhutla — ITHACKITS FORGEHACK 2026**

Repository ini merupakan antarmuka komando (*Command Center*) interaktif spasial berbasis Web GIS untuk visualisasi real-time dispersi partikulat abu vulkanik & asap karhutla di wilayah Indonesia.

---

## 🚀 Panduan Memulai Cepat (Quickstart)

### 1. Prasyarat Sistem
- Node.js >= 18.x / 20.x / 22.x
- npm >= 9.x

### 2. Instalasi Dependensi
`ash
npm install
`

### 3. Konfigurasi Lingkungan
Buat file .env (atau salin dari .env.example):
`ash
cp .env.example .env
`
Isi konfigurasi URL API Backend (default: http://127.0.0.1:8000):
`env
VITE_API_BASE_URL=http://127.0.0.1:8000
`

### 4. Menjalankan Server Pengembangan
`ash
npm run dev
`
Buka browser di **http://localhost:5173**.

### 5. Membangun Bundle Produksi
`ash
npm run build
`
Menjalankan 	sc -b (type checking) dan ite build untuk menghasilkan bundle produksi teroptimasi pada folder dist/.

---

## 🏗️ Arsitektur Spasial: 4-Zone Command Canvas

Frontend dibangun dengan arsitektur 4 zona kanvas taktis:

- **ZONA A: Tactical Command Header**
  - Brand & Status Kesiapsiagaan Real-time
  - Jam Ganda WIB & UTC
  - Banner Protokol Resmi Peringatan Dini Multi-Bahaya
- **ZONA B: Floating Controller Dock**
  - Pemilihan 20 Gunung Api Aktif & Hotspot Karhutla
  - Mode Simulasi Bebas (Custom Coordinates & Height)
  - Parameter Erupsi: Ketinggian Kolom Erupsi (km), Durasi, Arah Angin
  - Tombol Eksekusi Simulasi Taktis
- **ZONA C: Interactive GIS Workspace**
  - Basemap Satelit & Dark Canvas Leaflet
  - Layer Poligon Dispersi 3 Tingkat Probabilitas (P90 / P50 / P05)
  - Layer Fasilitas Publik: Sekolah (SPAB) & Fasilitas Kesehatan Bebas Abu
  - Rute Evakuasi Medis OSRM dengan Pin Penanda & Poligon Daratan
  - Timeline Player Dinamis (T+0 s.d. T+48 Jam)
- **ZONA D: Tabbed Inspection Dock (5 Tab Analitik)**
  - **Tab 1: Dampak Multisektoral** — Estimasi populasi terdampak P5-P50-P95, sebaran sawah & lahar
  - **Tab 2: Keselamatan Sekolah (SPAB)** — Triase rekomendasi PJJ daring & radius bahaya
  - **Tab 3: Rujukan Evakuasi Medis** — Jalur ambulans ke RS rujukan aman di luar zona dispersi
  - **Tab 4: Edukasi Kesehatan Respirasi** — Rekomendasi respirator N95 & mitigasi bahaya silika kristalin
  - **Tab 5: Integritas Sains & FSS** — Transparansi rumus fisika (Mastin 2009, Byram 1959, Stokes)

---

## 📁 Struktur Direktori

`	ext
FE-FORGEHACK-2026/
├── public/                 # Aset statis & ikon marker
├── src/
│   ├── components/
│   │   ├── layout/         # TacticalHeader, MapWorkspace, ControllerDock, TimelinePlayer
│   │   └── tabs/           # TabImpact, TabSchools, TabEvac, TabHealth, TabScience
│   ├── config/             # constants.ts (API URL, palet warna, ambang batas)
│   ├── services/           # api.ts (Klien REST API terenkapsulasi)
│   ├── types/              # api.ts, geo.ts (TypeScript interface & GeoJSON types)
│   ├── utils/              # formatters.ts
│   ├── App.tsx             # Root Layout
│   ├── index.css           # Tailwind CSS v4 & custom dark mode rules
│   └── main.tsx            # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
`

---

## 🔗 Keterhubungan Komponen ForgeHack 2026

- **Backend API:** [BE-FORGEHACK-2026](https://github.com/ITHACKITS/BE-FORGEHACK-2026)
- **AI & Physics Dispersion Engine:** [AI-FORGEHACK-2026](https://github.com/ITHACKITS/AI-FORGEHACK-2026)
