import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, Layers, X, LocateFixed, User, Eye, RotateCcw, Info } from "lucide-react";
import { CONFIG } from "../../config/constants";
import { api } from "../../services/api";
import { formatHour } from "../../utils/formatters";
import type { HazardType } from "../../types/api";
import { useLanguage } from "../../context/LanguageContext";

interface MapWorkspaceProps {
  hazard: HazardType;
  eventId: string;
  currentHour: number;
  hourlyTiersCache: Record<string | number, any> | null;
  evacuationRoute: { origin: [number, number]; dest: [number, number]; label: string } | null;
  onSelectEvent: (eventId: string, lat: number, lng: number, radiusKm: number) => void;
  resetViewTrigger: number;
  onToggleLegend?: () => void;
}

export const MapWorkspace: React.FC<MapWorkspaceProps> = ({
  hazard,
  eventId,
  currentHour,
  hourlyTiersCache,
  evacuationRoute,
  onSelectEvent,
  resetViewTrigger,
  onToggleLegend: _onToggleLegend
}) => {
  const { lang } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsTileLayerRef = useRef<L.TileLayer | null>(null);

  const [showVolcanoes, setShowVolcanoes] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showPlume, setShowPlume] = useState(true);
  const [showSchools, setShowSchools] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showAirports, setShowAirports] = useState(true);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);

  // Google Earth 3D & Location State
  const [is3DMode, setIs3DMode] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [heading, setHeading] = useState(0);
  const [isTiltPopoverOpen, setIsTiltPopoverOpen] = useState(false);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [streetViewCoords, setStreetViewCoords] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Camera Telemetry State (Matching Google Earth Status Bar in Image 2)
  const [mapTelemetry, setMapTelemetry] = useState<{ lat: number; lng: number; zoom: number }>({
    lat: CONFIG.DEFAULT_MAP_VIEW.lat,
    lng: CONFIG.DEFAULT_MAP_VIEW.lng,
    zoom: CONFIG.DEFAULT_MAP_VIEW.zoom
  });

  // Mouse Drag with Shift key for 3D Tilt & Rotate
  const isDragging3D = useRef(false);
  const startMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startTiltHeading = useRef<{ tilt: number; heading: number }>({ tilt: 0, heading: 0 });

  const volcanoesLayerRef = useRef<L.GeoJSON | null>(null);
  const hotspotsLayerRef = useRef<L.GeoJSON | null>(null);
  const schoolsLayerRef = useRef<L.GeoJSON | null>(null);
  const hospitalsLayerRef = useRef<L.GeoJSON | null>(null);
  const airportsLayerRef = useRef<L.GeoJSON | null>(null);
  const plumeLayerRef = useRef<L.GeoJSON | null>(null);
  const krbCircleRef = useRef<L.Circle | null>(null);
  const evacRouteLineRef = useRef<L.Polyline | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const volcanoesDataRef = useRef<any[]>([]);
  const forestsDataRef = useRef<any[]>([]);

  const applyBasemap = (map: L.Map, type: "satellite" | "dark") => {
    if (baseTileLayerRef.current) map.removeLayer(baseTileLayerRef.current);
    if (labelsTileLayerRef.current) map.removeLayer(labelsTileLayerRef.current);

    if (type === "satellite") {
      baseTileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
          maxZoom: 19
        }
      ).addTo(map);

      labelsTileLayerRef.current = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "",
          maxZoom: 19
        }
      ).addTo(map);
    } else {
      baseTileLayerRef.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap | PVMBG &bull; NASA FIRMS &bull; Open-Meteo",
        className: "dark-tiles",
        maxZoom: 18
      }).addTo(map);
    }
  };

  const handleResetIndonesia = () => {
    setHeading(0);
    setTilt(0);
    setIs3DMode(false);
    if (mapRef.current) {
      mapRef.current.flyTo(
        [CONFIG.DEFAULT_MAP_VIEW.lat, CONFIG.DEFAULT_MAP_VIEW.lng],
        CONFIG.DEFAULT_MAP_VIEW.zoom,
        { duration: 1.2 }
      );
    }
  };

  const handleShowMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Your browser does not support Geolocation services.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 13, { duration: 1.5 });

          if (userLocationMarkerRef.current) {
            mapRef.current.removeLayer(userLocationMarkerRef.current);
          }

          const pulseIcon = L.divIcon({
            className: "user-gps-marker",
            html: `
              <div class="relative flex items-center justify-center w-8 h-8">
                <span class="absolute inline-flex w-full h-full rounded-full bg-sky-400 opacity-75 animate-ping"></span>
                <span class="relative inline-flex w-4 h-4 rounded-full bg-sky-500 border-2 border-white shadow-lg"></span>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });

          userLocationMarkerRef.current = L.marker([latitude, longitude], { icon: pulseIcon }).addTo(mapRef.current);
          userLocationMarkerRef.current.bindPopup(`<strong class="text-xs">📍 Your Current Location</strong>`).openPopup();
        }
      },
      (err) => {
        setIsLocating(false);
        alert(`Failed to get location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenStreetView = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      setStreetViewCoords([center.lat, center.lng]);
      setIsStreetViewOpen(true);
    }
  };

  // Google Earth 3D Mode Toggle
  const handleToggle3D = () => {
    if (!is3DMode) {
      setIs3DMode(true);
      setTilt(45);
      setIsTiltPopoverOpen(true);
    } else {
      setIs3DMode(false);
      setTilt(0);
      setHeading(0);
      setIsTiltPopoverOpen(false);
    }
  };

  // Mouse Drag with Shift / Ctrl Key for 3D Earth Orientation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey) {
      isDragging3D.current = true;
      startMousePos.current = { x: e.clientX, y: e.clientY };
      startTiltHeading.current = { tilt, heading };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging3D.current) return;

    const deltaX = e.clientX - startMousePos.current.x;
    const deltaY = e.clientY - startMousePos.current.y;

    const newTilt = Math.min(60, Math.max(0, startTiltHeading.current.tilt - deltaY * 0.45));
    const newHeading = (startTiltHeading.current.heading + deltaX * 0.5 + 360) % 360;

    setTilt(Math.round(newTilt));
    setHeading(Math.round(newHeading));
    if (newTilt > 0) setIs3DMode(true);
  };

  const handleMouseUp = () => {
    isDragging3D.current = false;
  };

  // Inisialisasi Peta Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const cfg = CONFIG.DEFAULT_MAP_VIEW;
    const map = L.map(mapContainerRef.current, {
      center: [cfg.lat, cfg.lng],
      zoom: cfg.zoom,
      minZoom: cfg.minZoom,
      maxZoom: cfg.maxZoom,
      zoomControl: false
    });

    applyBasemap(map, "satellite");
    mapRef.current = map;

    const updateTelemetry = () => {
      const center = map.getCenter();
      setMapTelemetry({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom()
      });
    };

    map.on("move", updateTelemetry);
    map.on("zoomend", updateTelemetry);
    updateTelemetry();

    api.getCoastline()
      .then((geo) => {
        L.geoJSON(geo, {
          style: { color: "#A3C9A8", weight: 0.8, opacity: 0.35 }
        }).addTo(map);
      })
      .catch(() => {});

    loadVolcanoes(map);
    loadForests();
    loadHotspots(map);
    loadFacilities(map);

    return () => {
      map.off("move", updateTelemetry);
      map.off("zoomend", updateTelemetry);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Invalidate Leaflet tile bounds when 3D mode changes
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 150);
    }
  }, [is3DMode, tilt]);

  // Reset View Handler
  useEffect(() => {
    if (resetViewTrigger > 0 && mapRef.current) {
      mapRef.current.flyTo(
        [CONFIG.DEFAULT_MAP_VIEW.lat, CONFIG.DEFAULT_MAP_VIEW.lng],
        CONFIG.DEFAULT_MAP_VIEW.zoom,
        { duration: 1.2 }
      );
    }
  }, [resetViewTrigger]);

  const EVENT_COORDS: Record<string, [number, number, number]> = {
    anak_krakatau_2026_09: [-6.102, 105.423, 9],
    merapi_yogyakarta: [-7.540, 110.446, 10],
    lewotobi_laki_laki: [-8.538, 122.768, 10],
    marapi_sumatera: [-0.381, 100.473, 10],
    semeru: [-8.108, 112.922, 10],
    agung: [-8.343, 115.508, 10],
    rinjani: [-8.420, 116.470, 10],
    sinabung: [3.170, 98.392, 10],
    live_kalimantan: [-2.200, 113.900, 8]
  };

  const prevEventIdRef = useRef<string>(eventId);

  useEffect(() => {
    if (!mapRef.current) return;
    if (showVolcanoes) volcanoesLayerRef.current?.addTo(mapRef.current);
    else volcanoesLayerRef.current?.remove();
  }, [showVolcanoes]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (showHotspots) hotspotsLayerRef.current?.addTo(mapRef.current);
    else hotspotsLayerRef.current?.remove();
  }, [showHotspots]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (showSchools) schoolsLayerRef.current?.addTo(mapRef.current);
    else schoolsLayerRef.current?.remove();
  }, [showSchools]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (showHospitals) hospitalsLayerRef.current?.addTo(mapRef.current);
    else hospitalsLayerRef.current?.remove();
  }, [showHospitals]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (showAirports) airportsLayerRef.current?.addTo(mapRef.current);
    else airportsLayerRef.current?.remove();
  }, [showAirports]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (prevEventIdRef.current !== eventId) {
      prevEventIdRef.current = eventId;
      if (mapRef.current && eventId) {
        if (hazard === "fire") {
          const fireObj = (forestsDataRef.current || []).find((f: any) => f.id === eventId);
          if (fireObj) {
            mapRef.current.flyTo([fireObj.lat, fireObj.lon], 9, { duration: 1.0 });
          } else if (EVENT_COORDS[eventId]) {
            const target = EVENT_COORDS[eventId];
            mapRef.current.flyTo([target[0], target[1]], target[2], { duration: 1.0 });
          }
          if (krbCircleRef.current) {
            mapRef.current.removeLayer(krbCircleRef.current);
            krbCircleRef.current = null;
          }
          loadHotspots(mapRef.current, eventId);
        } else {
          const feat = (volcanoesDataRef.current || []).find(
            (f: any) => (f.properties?.event_id || f.properties?.id || f.id) === eventId
          );
          if (feat && feat.geometry && feat.geometry.coordinates) {
            const c = feat.geometry.coordinates;
            mapRef.current.flyTo([c[1], c[0]], 9, { duration: 1.0 });
            highlightKrb(mapRef.current, c[1], c[0], feat.properties?.radius_bahaya_km || 5.0);
          } else if (EVENT_COORDS[eventId]) {
            const target = EVENT_COORDS[eventId];
            mapRef.current.flyTo([target[0], target[1]], target[2], { duration: 1.0 });
            highlightKrb(mapRef.current, target[0], target[1], 5.0);
          }
        }
      }
    }
  }, [eventId, hazard]);

  const loadForests = async () => {
    try {
      const forests = await api.getNationalForests();
      const list = Array.isArray(forests) ? forests : (forests?.forests || []);
      forestsDataRef.current = list;
    } catch {
      // Offline fallback
    }
  };

  const loadVolcanoes = async (map: L.Map) => {
    try {
      const geo = await api.getNationalVolcanoes();
      const features = geo.features || [];
      volcanoesDataRef.current = features;

      if (volcanoesLayerRef.current) map.removeLayer(volcanoesLayerRef.current);

      volcanoesLayerRef.current = L.geoJSON({ type: "FeatureCollection", features } as any, {
        pointToLayer: (feature: any, latlng) => {
          const p = feature.properties;
          let imageSrc = "/1_normal.png";
          if (p.level === 2) imageSrc = "/2_waspada.png";
          else if (p.level === 3) imageSrc = "/3_siaga.png";
          else if (p.level === 4) imageSrc = "/4_awas.png";

          const isHighAlert = p.level >= 3;
          const pulseHtml = isHighAlert
            ? `<span class="volcano-pulse-ring ${p.level === 4 ? 'ring-red' : 'ring-orange'}"></span>`
            : "";

          const icon = L.divIcon({
            className: "volcano-div-icon",
            html: `
              <div class="relative flex items-center justify-center">
                ${pulseHtml}
                <img src="${imageSrc}" class="w-6 h-6 object-contain drop-shadow-md z-10 relative" style="transform: translateY(-2px);" />
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24]
          });

          return L.marker(latlng, { icon });
        },
        onEachFeature: (feature: any, layer) => {
          const p = feature.properties;
          const coords = feature.geometry.coordinates;

          layer.bindTooltip(`<strong>${p.name}</strong><br><span style="color:${p.color}">${p.level_name}</span>`, {
            direction: "top",
            offset: [0, -10]
          });

          layer.on("click", () => {
            highlightKrb(map, coords[1], coords[0], p.radius_bahaya_km);
            onSelectEvent(p.event_id || p.id, coords[1], coords[0], p.radius_bahaya_km);
          });
        }
      }).addTo(map);
    } catch {
      // Offline fallback
    }
  };

  const loadHotspots = async (map: L.Map, targetEventId?: string) => {
    try {
      const target = targetEventId || (hazard === "fire" ? eventId : "national");
      const geo = await api.getHotspots(target);
      const features = geo.features || [];

      if (hotspotsLayerRef.current) map.removeLayer(hotspotsLayerRef.current);

      hotspotsLayerRef.current = L.geoJSON({ type: "FeatureCollection", features } as any, {
        pointToLayer: (_feature: any, latlng) => {
          const icon = L.divIcon({
            className: "hotspot-icon",
            html: `<img src="/titik_api.png" class="w-5 h-5 object-contain drop-shadow-md" />`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feature: any, layer) => {
          const p = feature.properties;
          layer.bindTooltip(
            `🔥 <strong>Titik Api VIIRS</strong><br>Daya Panas (FRP): ${p.frp || '-'} MW`,
            { direction: "top" }
          );
        }
      }).addTo(map);
    } catch {
      // Offline fallback
    }
  };

  const loadFacilities = async (map: L.Map) => {
    try {
      const geo = await api.getFacilities();
      const features = geo.features || [];

      if (schoolsLayerRef.current) map.removeLayer(schoolsLayerRef.current);
      if (hospitalsLayerRef.current) map.removeLayer(hospitalsLayerRef.current);
      if (airportsLayerRef.current) map.removeLayer(airportsLayerRef.current);

      const schools = features.filter((f: any) => f.properties.facility_type === "school");
      const hospitals = features.filter((f: any) => f.properties.facility_type === "healthcare" || f.properties.facility_type === "hospital");
      const airports = features.filter((f: any) => f.properties.facility_type === "airport");

      schoolsLayerRef.current = L.geoJSON({ type: "FeatureCollection", features: schools } as any, {
        pointToLayer: (_feature: any, latlng) => {
          const icon = L.divIcon({
            className: "fac-icon-school",
            html: `<img src="/school.png" class="w-5 h-5 object-contain drop-shadow-sm" />`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feature: any, layer) => {
          const p = feature.properties;
          layer.bindPopup(`<div class="text-xs p-1 font-bold text-slate-800">${p.name || 'Sekolah'}</div>`);
        }
      });

      hospitalsLayerRef.current = L.geoJSON({ type: "FeatureCollection", features: hospitals } as any, {
        pointToLayer: (_feature: any, latlng) => {
          const icon = L.divIcon({
            className: "fac-icon-hospital",
            html: `<img src="/hospital.png" class="w-5 h-5 object-contain drop-shadow-sm" />`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feature: any, layer) => {
          const p = feature.properties;
          layer.bindPopup(`<div class="text-xs p-1 font-bold text-slate-800">${p.name || 'Fasilitas Kesehatan'}</div>`);
        }
      });

      airportsLayerRef.current = L.geoJSON({ type: "FeatureCollection", features: airports } as any, {
        pointToLayer: (_feature: any, latlng) => {
          const icon = L.divIcon({
            className: "fac-icon-airport",
            html: `<img src="/plane.png" class="w-5 h-5 object-contain drop-shadow-sm" />`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feature: any, layer) => {
          const p = feature.properties;
          layer.bindPopup(`<div class="text-xs p-1 font-bold text-slate-800">${p.name || 'Bandara'}</div>`);
        }
      });

      if (showSchools) schoolsLayerRef.current.addTo(map);
      if (showHospitals) hospitalsLayerRef.current.addTo(map);
      if (showAirports) airportsLayerRef.current.addTo(map);
    } catch {
      // Offline fallback
    }
  };

  const highlightKrb = (map: L.Map, lat: number, lng: number, radiusKm: number) => {
    if (krbCircleRef.current) map.removeLayer(krbCircleRef.current);

    krbCircleRef.current = L.circle([lat, lng], {
      radius: (radiusKm || 5.0) * 1000,
      color: "#DA6556",
      weight: 1.5,
      dashArray: "4, 4",
      fillColor: "#A14646",
      fillOpacity: 0.12
    }).addTo(map);

    krbCircleRef.current.bindTooltip(`Zona Rekomendasi Bahaya PVMBG (${radiusKm} km)`, { sticky: true });
  };

  useEffect(() => {
    if (!mapRef.current || !hourlyTiersCache) return;

    const map = mapRef.current;
    if (plumeLayerRef.current) map.removeLayer(plumeLayerRef.current);

    if (!showPlume) return;

    const hourKey = `hour_${currentHour}`;
    const geoData = hourlyTiersCache[hourKey] || hourlyTiersCache[currentHour] || (hourlyTiersCache.features ? hourlyTiersCache : null);

    if (!geoData) return;

    const colors = CONFIG.COLORS[hazard] || CONFIG.COLORS.volcano;

    plumeLayerRef.current = L.geoJSON(geoData, {
      style: (feature: any) => {
        const tier = feature.properties.tier || "mid";
        if (tier === "p90" || tier === "min") {
          return { color: colors.p90, fillColor: colors.p90, fillOpacity: 0.65, weight: 1.5 };
        }
        if (tier === "p50" || tier === "mid") {
          return { color: colors.p50, fillColor: colors.p50, fillOpacity: 0.40, weight: 1.2, dashArray: "3,3" };
        }
        return { color: colors.p05, fillColor: colors.p05, fillOpacity: 0.20, weight: 0.8 };
      },
      onEachFeature: (feature: any, layer) => {
        const p = feature.properties;
        const tierName = p.tier_label || (p.tier === "p90" || p.tier === "min" ? "Konsentrasi Tinggi (P90)" : (p.tier === "p50" || p.tier === "mid" ? "Konsentrasi Sedang (P50)" : "Jangkauan Maksimum (P05)"));
        layer.bindTooltip(`<strong>${colors.label}</strong><br>Tingkat: ${tierName}<br>Waktu: ${formatHour(currentHour)}`, {
          sticky: true
        });
      }
    }).addTo(map);
  }, [currentHour, hourlyTiersCache, hazard, showPlume]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (evacRouteLineRef.current) map.removeLayer(evacRouteLineRef.current);

    if (evacuationRoute) {
      evacRouteLineRef.current = L.polyline([evacuationRoute.origin, evacuationRoute.dest], {
        color: "#8AD6D1",
        weight: 3,
        dashArray: "6, 8",
        opacity: 0.95
      }).addTo(map);

      evacRouteLineRef.current.bindTooltip(`🚑 ${evacuationRoute.label}`, { permanent: true, direction: "center" });
      map.fitBounds(evacRouteLineRef.current.getBounds(), { padding: [60, 60], maxZoom: 13 });
    }
  }, [evacuationRoute]);

  // Calculate 3D perspective scale & translation to fill viewport seamlessly like Google Earth
  const isTilted = is3DMode || tilt > 0;
  const perspectiveScale = isTilted ? 1.08 + (tilt / 60) * 1.18 : 1;
  const perspectiveTranslateY = isTilted ? -(tilt / 60) * 8.5 : 0;
  const transformString = isTilted
    ? `perspective(1200px) rotateX(${tilt}deg) rotateZ(${heading}deg) scale(${perspectiveScale}) translateY(${perspectiveTranslateY}%)`
    : `perspective(1200px) rotateZ(${heading}deg)`;

  // Estimated altitude telemetry formula for Google Earth status bar
  const cameraAltitudeMeters = Math.round(25000000 / Math.pow(2, mapTelemetry.zoom));

  return (
    <div className="relative w-full h-full overflow-hidden map-viewport-3d bg-[#050a14] select-none">
      {/* 1. Google Earth Sky Atmosphere & Horizon Glow Overlays (Top Haze Layer in Image 2) */}
      <div 
        className="earth-sky-atmosphere pointer-events-none"
        style={{ opacity: tilt > 0 ? Math.min(1, tilt / 30) : 0 }}
      />
      <div 
        className="earth-horizon-fog pointer-events-none"
        style={{ opacity: tilt > 0 ? Math.min(0.85, tilt / 35) : 0 }}
      />

      {/* 2. Map Canvas Wrapper Container (Oversized when Tilted to Prevent Edge Cutoffs) */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`absolute transition-all duration-300 ${
          isTilted ? "w-[160%] h-[190%] -left-[30%] -top-[45%]" : "w-full h-full left-0 top-0"
        }`}
      >
        <div 
          ref={mapContainerRef} 
          className="w-full h-full map-pane-tilt"
          style={{
            transform: transformString,
            transformOrigin: "50% 88%"
          }}
        />
      </div>

      {/* 3. Google Earth 3D Mode Notice Banner (Gambar 2 Bottom Center) */}
      {isTilted && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[500] hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full aurora-glass-card border border-white/20 text-[11px] text-slate-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Google Earth 3D Active &bull; Hold <kbd className="px-1 py-0.5 rounded bg-white/20 font-mono text-[9px] text-white">Shift</kbd> + Drag mouse to tilt & rotate</span>
        </div>
      )}

      {/* 4. Telemetry Camera & Coordinates Status Line (Gambar 2 Bottom Right) */}
      <div className="absolute bottom-2 right-4 z-[500] hidden sm:flex items-center gap-3 text-[10px] font-mono text-slate-300/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
        <span>Camera: {cameraAltitudeMeters.toLocaleString()} m</span>
        <span className="text-white/30">&bull;</span>
        <span>
          {Math.abs(mapTelemetry.lat).toFixed(4)}°{mapTelemetry.lat >= 0 ? "N" : "S"}{" "}
          {Math.abs(mapTelemetry.lng).toFixed(4)}°{mapTelemetry.lng >= 0 ? "E" : "W"}
        </span>
      </div>

      {/* 5. Panel Lapisan Spasial Aktif (Kiri Bawah) */}
      {!isLayerPanelOpen ? (
        <button
          onClick={() => setIsLayerPanelOpen(true)}
          className="absolute bottom-20 left-2 sm:bottom-6 sm:left-4 z-[500] w-10 h-10 rounded-2xl shadow-2xl flex items-center justify-center transition cursor-pointer active:scale-95 group aurora-glass-card"
          title="Tampilkan Lapisan Spasial"
        >
          <Layers className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
        </button>
      ) : (
        <div
          className="absolute bottom-20 left-2 sm:bottom-6 sm:left-4 z-[500] rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5 aurora-glass-card text-slate-100 transition-all duration-300 max-w-[calc(100%-1rem)]"
          style={{ minWidth: "200px" }}
        >
          <div className="flex items-center justify-between border-b pb-2 mb-0.5 border-white/10">
            <h3 className="text-[10px] font-extrabold tracking-widest uppercase text-emerald-300">
              {lang === "id" ? "Lapisan Spasial Aktif" : "Active Spatial Layers"}
            </h3>
            <button onClick={() => setIsLayerPanelOpen(false)} className="text-slate-400 hover:text-white transition cursor-pointer p-0.5" title={lang === "id" ? "Tutup Panel" : "Hide Panel"}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showVolcanoes} onChange={(e) => setShowVolcanoes(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <img src="/1_normal.png" className="w-4 h-4 object-contain" />
            <span>{lang === "id" ? "Gunung Api PVMBG" : "PVMBG Volcanoes"}</span>
          </label>
          
          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <img src="/titik_api.png" className="w-4 h-4 object-contain" />
            <span>{lang === "id" ? "Titik Panas NASA FIRMS" : "NASA FIRMS Hotspots"}</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showPlume} onChange={(e) => setShowPlume(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(253, 183, 115, 0.3)", border: "1px dashed #FDB773" }}></div>
            <span>{lang === "id" ? "Peluang Sebaran (Ensemble)" : "Dispersion Probability"}</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showSchools} onChange={(e) => setShowSchools(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <img src="/school.png" className="w-4 h-4 object-contain" />
            <span>{lang === "id" ? "Fasilitas Sekolah" : "School Facilities"}</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showHospitals} onChange={(e) => setShowHospitals(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <img src="/hospital.png" className="w-4 h-4 object-contain" />
            <span>{lang === "id" ? "Fasilitas Kesehatan" : "Healthcare Facilities"}</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showAirports} onChange={(e) => setShowAirports(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <img src="/plane.png" className="w-4 h-4 object-contain" />
            <span>{lang === "id" ? "Bandara Udara" : "Airports"}</span>
          </label>
        </div>
      )}

      {/* Google Earth 3D Tilt & Heading Popover Dialog */}
      {isTiltPopoverOpen && (
        <div
          className="absolute bottom-36 right-4 z-[600] w-80 rounded-2xl p-4 shadow-2xl aurora-glass-card text-slate-100 border border-white/20 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-extrabold text-white">Google Earth 3D Controls</h3>
            </div>
            <button
              onClick={() => setIsTiltPopoverOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Keyboard Shortcuts Info Box */}
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2 mb-3">
            <span className="font-bold block text-white text-[11px]">Keyboard shortcuts</span>
            <p className="text-[10px] leading-relaxed text-slate-300">
              You can hold <kbd className="px-1 py-0.5 rounded bg-white/20 font-mono text-[9px]">Shift</kbd> while dragging the Earth to tilt and rotate, or <kbd className="px-1 py-0.5 rounded bg-white/20 font-mono text-[9px]">Control</kbd> to look around.
            </p>
            <div className="flex justify-between pt-1 font-bold text-[10px] text-sky-400">
              <button onClick={() => setIsTiltPopoverOpen(false)} className="hover:underline cursor-pointer">Got it</button>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("3D rotation allows perspective elevation exploration of volcano terrain and aerosol plume dispersion contours."); }} className="hover:underline">Learn more</a>
            </div>
          </div>

          {/* Tilt Slider */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs font-semibold text-slate-200">
              <span>Tilt Angle:</span>
              <span className="font-mono text-sky-300">{tilt}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={tilt}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTilt(val);
                if (val > 0) setIs3DMode(true);
              }}
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>

          {/* Heading Slider */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs font-semibold text-slate-200">
              <span>Heading Angle:</span>
              <span className="font-mono text-purple-300">{heading}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={heading}
              onChange={(e) => setHeading(Number(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer"
            />
          </div>

          {/* Reset to North Button */}
          <div className="flex justify-between items-center pt-1 border-t border-white/10">
            <button
              onClick={() => {
                setHeading(0);
                setTilt(0);
                setIs3DMode(false);
              }}
              className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to North</span>
            </button>
            <button
              onClick={handleResetIndonesia}
              className="text-[10px] px-2.5 py-1 rounded-full aurora-btn text-white"
            >
              Reset Map
            </button>
          </div>
        </div>
      )}

      {/* GOOGLE EARTH-STYLE FLOATING SUITE CONTROL DOCK (Kanan Bawah - Gambar 1 & 2) */}
      <div className="absolute bottom-20 right-2 sm:bottom-8 sm:right-4 flex items-center gap-2 z-[500]">
        {/* Container Tombol Bulat Khas Google Earth */}
        <div className="flex items-center gap-1.5 p-1 rounded-full aurora-glass-card shadow-2xl border border-white/20">
          {/* 1. Street View Pegman Icon Button */}
          <button
            type="button"
            onClick={handleOpenStreetView}
            className="w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md"
            title="Show Street View (Google Maps 360 Viewer)"
          >
            <User className="w-4 h-4" />
          </button>

          {/* 2. Show Your Location (Geolocation API) Button */}
          <button
            type="button"
            onClick={handleShowMyLocation}
            disabled={isLocating}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 border shadow-md ${
              isLocating
                ? "bg-sky-500/40 text-sky-300 animate-pulse border-sky-400"
                : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/20"
            }`}
            title="Show your location (GPS Lokasi Anda)"
          >
            <LocateFixed className={`w-4 h-4 ${isLocating ? "animate-spin" : ""}`} />
          </button>

          {/* 3. 2D / 3D Mode Toggle Button (Shows 2D when 3D mode is active to allow 1-click reset, matching Gambar 2) */}
          <button
            type="button"
            onClick={handleToggle3D}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold transition cursor-pointer hover:scale-110 active:scale-95 border shadow-md ${
              is3DMode
                ? "bg-emerald-500/40 text-emerald-300 border-emerald-400/60 shadow-emerald-500/20"
                : "bg-white/10 text-slate-200 border-white/15 hover:bg-white/20"
            }`}
            title={is3DMode ? "Switch back to 2D flat view" : "Switch to 3D perspective view"}
          >
            {is3DMode ? "2D" : "3D"}
          </button>

          {/* 4. Compass Needle Heading Button */}
          <button
            type="button"
            onClick={() => {
              if (heading !== 0) setHeading(0);
              else setIsTiltPopoverOpen(!isTiltPopoverOpen);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-600/90 text-white shadow-md hover:scale-110 transition cursor-pointer relative overflow-hidden border border-blue-400/40"
            title={`Compass Heading (${heading}°). Click to reset North.`}
          >
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-300"
              style={{ transform: `rotate(${-heading}deg)` }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <polygon points="12,2 15,12 12,10 9,12" fill="#FF4D4D" />
                <polygon points="12,22 15,12 12,10 9,12" fill="#FFFFFF" />
              </svg>
            </div>
          </button>
        </div>

        {/* 5. Combined Zoom Control Pill (- / +) */}
        <div
          className="flex items-center rounded-full overflow-hidden shadow-2xl aurora-glass-card border border-white/20"
        >
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-8 h-9 flex items-center justify-center transition cursor-pointer active:scale-95 hover:bg-white/10 text-white border-r border-white/10"
            title="Perkecil Peta (Zoom Out)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-8 h-9 flex items-center justify-center transition cursor-pointer active:scale-95 hover:bg-white/10 text-white"
            title="Perbesar Peta (Zoom In)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* STREET VIEW 360 PANORAMA MODAL */}
      {isStreetViewOpen && streetViewCoords && (
        <div
          className="fixed inset-0 z-[1300] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsStreetViewOpen(false)}
        >
          <div
            className="w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden shadow-2xl aurora-glass-card flex flex-col border border-white/20 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3 flex items-center justify-between bg-black/40 border-b border-white/10">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-extrabold text-white">Google Street View 360° Interactive</h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    Koordinat: {streetViewCoords[0].toFixed(4)}, {streetViewCoords[1].toFixed(4)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsStreetViewOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Embedded StreetView iframe viewer */}
            <div className="flex-1 w-full bg-black relative">
              <iframe
                title="Google Street View Panorama"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${streetViewCoords[0]},${streetViewCoords[1]}&layer=c&cbll=${streetViewCoords[0]},${streetViewCoords[1]}&cbp=12,0,0,0,0&output=embed`}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-2.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                Seret tetikus pada jendela panorama untuk melihat sekeliling lokasi secara 360°.
              </span>
              <button
                onClick={() => setIsStreetViewOpen(false)}
                className="px-4 py-1 rounded-full aurora-btn text-xs font-bold"
              >
                Tutup Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
