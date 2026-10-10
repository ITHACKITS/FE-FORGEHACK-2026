import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, Layers, X, LocateFixed, User, Eye, RotateCcw, Info, Map as MapIcon, Satellite } from "lucide-react";
import { CONFIG } from "../../config/constants";
import { api } from "../../services/api";
import { formatHour } from "../../utils/formatters";
import type { HazardType, SimulationOverrides } from "../../types/api";
import { useLanguage, useTr } from "../../context/useLanguage";
import { compassLabel, forestName, volcanoName } from "../../utils/apiLabels";
import { SmokeEngine } from "../../simulation/smokeEngine";
import { buildSmokeScenario, windFromLabel } from "../../simulation/smokeScenarios";
import { SmokeLeafletLayer } from "../../simulation/smokeLeafletLayer";
import { EXPOSURE_TIER_COLORS } from "../../simulation/smokeExposureRenderer";
import { clearSmoke3D, syncSmoke3D } from "../../simulation/smoke3d";
import { NationalModes, type NationalMode } from "./NationalModes";
import { CameraReadout, ScaleBar } from "./MapReadouts";
import { NearbyLayers, type NearbyStats, type VolcanoFeature, type Forest } from "../../simulation/nearbyLayers";

interface MapWorkspaceProps {
  hazard: HazardType;
  eventId: string;
  currentHour: number;
  hourlyTiersCache: Record<string | number, any> | null;
  onSelectEvent: (eventId: string, lat: number, lng: number, radiusKm: number) => void;
  resetViewTrigger: number;
  onToggleLegend?: () => void;
  /** Experiment-mode overrides that reshape the example smoke simulation (null in auto mode). */
  smokeOverrides?: SimulationOverrides | null;
}

export const MapWorkspace: React.FC<MapWorkspaceProps> = ({
  hazard,
  eventId,
  currentHour,
  hourlyTiersCache,
  onSelectEvent,
  resetViewTrigger,
  onToggleLegend: _onToggleLegend,
  smokeOverrides = null
}) => {
  const { lang } = useLanguage();
  const tr = useTr();
  // Leaflet callbacks outlive a render, so they read the current language from a ref.
  const langRef = useRef(lang);
  langRef.current = lang;
  const trNow = (en: string, id: string) => (langRef.current === "id" ? id : en);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const map3DContainerRef = useRef<HTMLDivElement>(null);
  const map3DElementRef = useRef<HTMLElement | null>(null);
  const gmapsScriptLoadedRef = useRef(false);

  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsTileLayerRef = useRef<L.TileLayer | null>(null);

  const [showVolcanoes, setShowVolcanoes] = useState(true);
  const [showForests, setShowForests] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);
  const [showAshPaths, setShowAshPaths] = useState(true);
  const [nearbyStats, setNearbyStats] = useState<NearbyStats | null>(null);
  const [showPlume, setShowPlume] = useState(true);
  // Airports start hidden so the hazard layers read clearly; users can switch them on.
  const [showAirports, setShowAirports] = useState(false);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(true);
  const [showSmoke, setShowSmoke] = useState(true);
  // Nationwide wind/heatmap modes; the example smoke sim hides while one is on.
  const [nationalMode, setNationalMode] = useState<NationalMode>("off");
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  // "exposure": landing-style paper map with a smoke-density grid; "satellite": Esri imagery.
  const [mapStyle, setMapStyle] = useState<"exposure" | "satellite">("exposure");
  const [smoke3DError, setSmoke3DError] = useState<string | null>(null);
  const smokeLayerRef = useRef<SmokeLeafletLayer | null>(null);

  // Google Earth 3D & Location State
  const [is3DMode, setIs3DMode] = useState(false);
  const [tilt, setTilt] = useState(0);
  const [heading, setHeading] = useState(0);
  const [isTiltPopoverOpen, setIsTiltPopoverOpen] = useState(false);
  const [isStreetViewOpen, setIsStreetViewOpen] = useState(false);
  const [streetViewCoords, setStreetViewCoords] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [is3DLoading, setIs3DLoading] = useState(false);
  const [map3DError, setMap3DError] = useState<string | null>(null);

  // Mouse Drag with Shift key for 3D Tilt & Rotate
  const isDragging3D = useRef(false);
  const startMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const startTiltHeading = useRef<{ tilt: number; heading: number }>({ tilt: 0, heading: 0 });

  const nearbyRef = useRef<NearbyLayers | null>(null);
  const onSelectEventRef = useRef(onSelectEvent);
  onSelectEventRef.current = onSelectEvent;
  const airportsLayerRef = useRef<L.GeoJSON | null>(null);
  const plumeLayerRef = useRef<L.GeoJSON | null>(null);
  const krbCircleRef = useRef<L.Circle | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const volcanoesDataRef = useRef<any[]>([]);
  const forestsDataRef = useRef<any[]>([]);

  const applyBasemap = (map: L.Map, type: "satellite" | "dark" | "paper") => {
    if (baseTileLayerRef.current) map.removeLayer(baseTileLayerRef.current);
    if (labelsTileLayerRef.current) map.removeLayer(labelsTileLayerRef.current);
    labelsTileLayerRef.current = null;
    map.getContainer().classList.toggle("map-paper", type === "paper");

    if (type === "paper") {
      // Faded OSM under a cream background, like the landing page's illustrated map.
      baseTileLayerRef.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        className: "paper-tiles",
        maxZoom: 18
      }).addTo(map);
      return;
    }

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
      alert(trNow("Geolocation is not supported by your browser.", "Browser Anda tidak mendukung geolokasi."));
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (!mapRef.current) { setIsLocating(false); return; }

        mapRef.current.flyTo([latitude, longitude], 14, { duration: 1.5 });

        if (userLocationMarkerRef.current) {
          mapRef.current.removeLayer(userLocationMarkerRef.current);
        }

        const pulseIcon = L.divIcon({
          className: "user-gps-marker",
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px">
              <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:rgba(56,189,248,0.45);animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite"></span>
              <span style="position:relative;width:16px;height:16px;border-radius:50%;background:#38bdf8;border:2.5px solid white;box-shadow:0 2px 8px rgba(56,189,248,0.6)"></span>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        // Build popup immediately with coords; update with address when ready
        const marker = L.marker([latitude, longitude], { icon: pulseIcon }).addTo(mapRef.current);
        userLocationMarkerRef.current = marker;
        marker.bindPopup(
          `<div style="font-size:12px;line-height:1.6">
            <strong>📍 ${trNow("Your Location", "Lokasi Anda")}</strong><br/>
            <span style="color:#94a3b8">${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°</span><br/>
            <span style="color:#64748b;font-size:10px">${trNow("Accuracy", "Akurasi")}: ±${Math.round(accuracy)} m</span>
          </div>`,
          { maxWidth: 220 }
        ).openPopup();
        setIsLocating(false);

        // Reverse-geocode using Google Maps Geocoding API (if key present)
        const apiKey = CONFIG.GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          try {
            const res = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=id&result_type=sublocality|locality`
            );
            const data = await res.json();
            const address = data?.results?.[0]?.formatted_address;
            if (address && userLocationMarkerRef.current) {
              userLocationMarkerRef.current.setPopupContent(
                `<div style="font-size:12px;line-height:1.6">
                  <strong>📍 ${trNow("Your Location", "Lokasi Anda")}</strong><br/>
                  <span style="color:#e2e8f0;font-size:11px">${address}</span><br/>
                  <span style="color:#64748b;font-size:10px">${latitude.toFixed(5)}°, ${longitude.toFixed(5)}° · ±${Math.round(accuracy)} m</span>
                </div>`
              );
              userLocationMarkerRef.current.openPopup();
            }
          } catch {
            // Geocoding failed silently — coords already shown
          }
        }
      },
      (err) => {
        setIsLocating(false);
        const messages: Record<number, string> = {
          1: trNow("Location permission was denied. Please allow location access in your browser settings and try again.", "Izin lokasi ditolak. Izinkan akses lokasi di pengaturan browser, lalu coba lagi."),
          2: trNow("Location could not be determined. This can happen indoors or in areas with poor GPS signal. Try moving to an open area.", "Lokasi tidak dapat ditentukan. Ini bisa terjadi di dalam ruangan atau di area dengan sinyal GPS lemah. Coba pindah ke tempat terbuka."),
          3: trNow("Location request timed out. Please try again.", "Permintaan lokasi melewati batas waktu. Silakan coba lagi.")
        };
        alert(messages[err.code] ?? `${trNow("Location error", "Galat lokasi")}: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000   // accept cached position up to 30 s old
      }
    );
  };

  const handleOpenStreetView = () => {
    if (mapRef.current) {
      const center = mapRef.current.getCenter();
      setStreetViewCoords([center.lat, center.lng]);
      setIsStreetViewOpen(true);
    }
  };

  // Load Google Maps JS API script once
  const loadGoogleMapsScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (gmapsScriptLoadedRef.current || (window as any).google?.maps) {
        gmapsScriptLoadedRef.current = true;
        resolve();
        return;
      }
      // Check if script tag already in DOM
      const existing = document.querySelector('script[data-gmaps-loader]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Google Maps script failed to load')));
        return;
      }
      const apiKey = CONFIG.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
        return;
      }
      const script = document.createElement('script');
      script.setAttribute('data-gmaps-loader', 'true');
      // Use beta channel for Map3DElement (photorealistic 3D tiles)
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=beta&libraries=maps3d`;
      script.async = true;
      script.defer = true;
      script.onload = () => { gmapsScriptLoadedRef.current = true; resolve(); };
      script.onerror = () => reject(new Error('Failed to load Google Maps JS API. Check API key & enabled APIs.'));
      document.head.appendChild(script);
    });
  }, []);

  // Mount the real Google Maps 3D element inside map3DContainerRef
  const mountMap3D = useCallback(async () => {
    if (!map3DContainerRef.current) return;
    setIs3DLoading(true);
    setMap3DError(null);
    try {
      await loadGoogleMapsScript();
      // Destroy any previous instance
      if (map3DElementRef.current) {
        map3DContainerRef.current.innerHTML = '';
        map3DElementRef.current = null;
      }
      // Get current Leaflet center
      const center = mapRef.current?.getCenter();
      const lat = center?.lat ?? CONFIG.DEFAULT_MAP_VIEW.lat;
      const lng = center?.lng ?? CONFIG.DEFAULT_MAP_VIEW.lng;
      const zoom = mapRef.current?.getZoom() ?? CONFIG.DEFAULT_MAP_VIEW.zoom;
      // Altitude based on zoom (rough Google Earth equivalent)
      const altitudeMeters = Math.round(25_000_000 / Math.pow(2, zoom));

      // Use the custom element registered by the Maps JS API beta
      const el = document.createElement('gmp-map-3d') as HTMLElement;
      el.setAttribute('center', `${lat},${lng},${altitudeMeters}`);
      el.setAttribute('tilt', '67.5');
      el.setAttribute('heading', String(heading));
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.display = 'block';
      map3DContainerRef.current.appendChild(el);
      map3DElementRef.current = el;
    } catch (err: any) {
      console.error('[Map3D]', err);
      setMap3DError(err?.message ?? 'Unknown error loading 3D map');
    } finally {
      setIs3DLoading(false);
    }
  }, [heading, loadGoogleMapsScript]);

  // Unmount Google Maps 3D element
  const unmountMap3D = useCallback(() => {
    if (map3DContainerRef.current) {
      map3DContainerRef.current.innerHTML = '';
    }
    map3DElementRef.current = null;
    setMap3DError(null);
  }, []);

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
      unmountMap3D();
    }
  };

  // Mouse Drag with Shift / Ctrl Key for 3D Earth Orientation
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!CONFIG.FEATURES.MAP_3D) return;
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
      zoomControl: false,
      // Vector layers (coastline, plume tiers) on one canvas instead of many SVG nodes.
      preferCanvas: true
    });

    // The basemap itself is applied by the mapStyle effect below.
    mapRef.current = map;
    setMapInstance(map);
    smokeLayerRef.current = new SmokeLeafletLayer(map);

    // Volcanoes, forests, hotspots and ash paths are drawn only near the map centre.
    nearbyRef.current = new NearbyLayers(map, {
      onSelectVolcano: (f) => {
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties;
        highlightKrb(map, lat, lng, p.radius_bahaya_km);
        onSelectEventRef.current(p.event_id || p.id, lat, lng, p.radius_bahaya_km);
      },
      onSelectForest: (f) => onSelectEventRef.current(f.id, f.lat, f.lon, 0),
      onStats: setNearbyStats
    });
    nearbyRef.current.setLang(langRef.current);

    api.getCoastline()
      .then((geo) => {
        L.geoJSON(geo, {
          style: { color: "#A3C9A8", weight: 0.8, opacity: 0.35 }
        }).addTo(map);
      })
      .catch(() => {});

    loadVolcanoes();
    loadForests();
    loadHotspots();
    loadAshPaths();
    loadFacilities(map);

    return () => {
      nearbyRef.current?.destroy();
      nearbyRef.current = null;
      smokeLayerRef.current?.destroy();
      smokeLayerRef.current = null;
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  // Runs once: the Leaflet map is created on mount and torn down on unmount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invalidate Leaflet tile bounds when 3D mode changes; mount/unmount Google Maps 3D
  useEffect(() => {
    if (is3DMode) {
      mountMap3D();
    } else {
      unmountMap3D();
      // Refresh leaflet tiles after returning from 3D
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is3DMode]);

  // Example smoke simulation: one engine per hazard/event/overrides combination,
  // shared by the Leaflet canvas (2D) and the Google Maps 3D slices.
  const smokeOverridesKey = smokeOverrides ? JSON.stringify(smokeOverrides) : "";
  const smokeEngine = useMemo(
    () => new SmokeEngine(buildSmokeScenario(hazard, eventId, smokeOverridesKey ? JSON.parse(smokeOverridesKey) : null)),
    [hazard, eventId, smokeOverridesKey]
  );
  const smokeWind = useMemo(() => {
    const w = smokeEngine.windAtCenter(currentHour);
    return { speed: Math.hypot(w.u, w.v), from: windFromLabel(w.u, w.v) };
  }, [smokeEngine, currentHour]);

  useEffect(() => {
    smokeLayerRef.current?.setEngine(smokeEngine);
  }, [smokeEngine]);

  useEffect(() => {
    if (!mapRef.current) return;
    applyBasemap(mapRef.current, mapStyle === "exposure" ? "paper" : "satellite");
    smokeLayerRef.current?.setStyle(mapStyle === "exposure" ? "exposure" : "puffs");
  }, [mapStyle]);

  useEffect(() => {
    smokeLayerRef.current?.setTargetHour(currentHour);
  }, [currentHour]);

  useEffect(() => {
    smokeLayerRef.current?.setVisible(showSmoke && !is3DMode && nationalMode === "off");
  }, [showSmoke, is3DMode, nationalMode]);

  useEffect(() => {
    const el = map3DElementRef.current;
    if (!is3DMode || is3DLoading || !el) return;
    if (!showSmoke) {
      clearSmoke3D(el);
      return;
    }
    let cancelled = false;
    syncSmoke3D(el, smokeEngine, currentHour).then((err) => {
      if (!cancelled) setSmoke3DError(err);
    });
    return () => { cancelled = true; };
  }, [is3DMode, is3DLoading, showSmoke, smokeEngine, currentHour]);

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

  // The national "Forecast" frame already draws every smoke/ash path, so hide the nearby ones then.
  useEffect(() => {
    nearbyRef.current?.setVisibility({
      volcanoes: showVolcanoes,
      forests: showForests,
      hotspots: showHotspots,
      ashPaths: showAshPaths && nationalMode !== "forecast"
    });
  }, [showVolcanoes, showForests, showHotspots, showAshPaths, nationalMode]);

  useEffect(() => {
    nearbyRef.current?.setSelected(eventId);
  }, [eventId]);

  useEffect(() => {
    nearbyRef.current?.setLang(lang);
    // Leaflet's own attribution link carries an English title; follow the UI language.
    const ac = mapInstance?.attributionControl;
    const prefix = ac?.options.prefix;
    if (ac && typeof prefix === "string") {
      ac.setPrefix(prefix.replace(/title="[^"]*"/, `title="${lang === "id" ? "Pustaka JavaScript untuk peta interaktif" : "A JavaScript library for interactive maps"}"`));
    }
  }, [lang, mapInstance]);

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
          loadHotspots(eventId);
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
          loadHotspots();
        }
      }
    }
  // Only react to a new event/hazard; the loaders are recreated every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, hazard]);

  const loadForests = async () => {
    try {
      const forests = await api.getNationalForests();
      const list: Forest[] = Array.isArray(forests) ? forests : (forests?.forests || []);
      forestsDataRef.current = list;
      nearbyRef.current?.setForests(list);
    } catch {
      // Offline fallback
    }
  };

  const loadVolcanoes = async () => {
    try {
      const geo = await api.getNationalVolcanoes();
      const features: VolcanoFeature[] = geo.features || [];
      volcanoesDataRef.current = features;
      nearbyRef.current?.setVolcanoes(features);
    } catch {
      // Offline fallback
    }
  };

  // National hotspots, or one fire event's hotspots while that event is selected.
  const hotspotsKeyRef = useRef<string | null>(null);
  const loadHotspots = async (targetEventId = "national") => {
    if (hotspotsKeyRef.current === targetEventId) return;
    hotspotsKeyRef.current = targetEventId;
    try {
      const geo = await api.getHotspots(targetEventId);
      if (hotspotsKeyRef.current === targetEventId) nearbyRef.current?.setHotspots(geo.features || []);
    } catch {
      hotspotsKeyRef.current = null;
    }
  };

  const loadAshPaths = async () => {
    try {
      const res = await api.getSmokePaths(72);
      if (res.available) nearbyRef.current?.setAshPaths(res.paths, res.marks_every_h ?? 24);
    } catch {
      // Offline fallback: no ash paths
    }
  };

  const loadFacilities = async (map: L.Map) => {
    try {
      const geo = await api.getFacilities();
      const airports = (geo.features || []).filter((f: any) => f.properties.facility_type === "airport");

      if (airportsLayerRef.current) map.removeLayer(airportsLayerRef.current);

      airportsLayerRef.current = L.geoJSON({ type: "FeatureCollection", features: airports } as any, {
        pointToLayer: (_feature: any, latlng) => {
          const icon = L.divIcon({
            className: "fac-icon-airport",
            html: `<img src="/plane.png" alt="" class="w-5 h-5 object-contain drop-shadow-sm" />`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          return L.marker(latlng, { icon });
        },
        onEachFeature: (feature: any, layer) => {
          // Facility names come from the API, so render them as text, not HTML.
          const popup = document.createElement("div");
          popup.className = "text-xs p-1 font-bold text-slate-800";
          popup.textContent = feature.properties.name || trNow("Airport", "Bandara");
          layer.bindPopup(popup);
        }
      });

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

    krbCircleRef.current.bindTooltip(trNow(`PVMBG recommended danger zone (${radiusKm} km)`, `Zona Rekomendasi Bahaya PVMBG (${radiusKm} km)`), { sticky: true });
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
        const high = p.tier === "p90" || p.tier === "min";
        const mid = p.tier === "p50" || p.tier === "mid";
        const tierName = high
          ? tr("High concentration (P90)", "Konsentrasi tinggi (P90)")
          : mid
            ? tr("Moderate concentration (P50)", "Konsentrasi sedang (P50)")
            : tr("Maximum reach (P05)", "Jangkauan maksimum (P05)");
        const title = hazard === "fire"
          ? tr("Peat fire smoke spread (PM2.5)", "Sebaran asap karhutla (PM2.5)")
          : tr("Volcanic ash spread", "Sebaran abu vulkanik");
        layer.bindTooltip(`<strong>${title}</strong><br>${tr("Tier", "Tingkat")}: ${tierName}<br>${tr("Time", "Waktu")}: ${formatHour(currentHour, lang)}`, {
          sticky: true
        });
      }
    }).addTo(map);
  }, [currentHour, hourlyTiersCache, hazard, showPlume, lang, tr]);

  // Calculate 3D perspective scale & translation to fill viewport seamlessly like Google Earth
  // (Only used when not in real Google Maps 3D mode)
  const isTilted = !is3DMode && tilt > 0;
  const perspectiveScale = isTilted ? 1.08 + (tilt / 60) * 1.18 : 1;
  const perspectiveTranslateY = isTilted ? -(tilt / 60) * 8.5 : 0;
  const transformString = isTilted
    ? `perspective(1200px) rotateX(${tilt}deg) rotateZ(${heading}deg) scale(${perspectiveScale}) translateY(${perspectiveTranslateY}%)`
    : undefined;

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

      {/* 2. Map Canvas Wrapper — Leaflet 2D (hidden when Google Maps 3D is active) */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`absolute transition-all duration-300 ${
          isTilted ? "w-[160%] h-[190%] -left-[30%] -top-[45%]" : "w-full h-full left-0 top-0"
        }`}
        style={{ visibility: is3DMode ? 'hidden' : 'visible' }}
      >
        <div 
          ref={mapContainerRef} 
          className="w-full h-full map-pane-tilt"
          style={transformString ? { transform: transformString, transformOrigin: "50% 88%" } : undefined}
        />
      </div>

      {/* 2b. Google Maps Photorealistic 3D Layer (overlays when is3DMode = true) */}
      <div
        ref={map3DContainerRef}
        className="absolute inset-0 z-[200]"
        style={{ display: is3DMode ? 'block' : 'none' }}
      />

      {/* 2c. 3D Loading Spinner */}
      {is3DMode && is3DLoading && (
        <div className="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-[#050a14]/80 backdrop-blur-sm gap-3">
          <svg className="w-10 h-10 text-sky-400 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-slate-300 text-sm font-medium">Loading Google Maps 3D…</span>
        </div>
      )}

      {/* 2d. 3D Error Banner */}
      {is3DMode && map3DError && !is3DLoading && (
        <div className="absolute inset-0 z-[300] flex flex-col items-center justify-center bg-[#050a14]/85 backdrop-blur-sm gap-4 px-8 text-center">
          <span className="text-4xl">⚠️</span>
          <h3 className="text-white font-bold text-base">Google Maps 3D could not be loaded</h3>
          <p className="text-slate-400 text-xs max-w-sm">{map3DError}</p>
          <p className="text-slate-500 text-xs">Make sure the <strong className="text-slate-300">Maps JavaScript API</strong> and <strong className="text-slate-300">Map Tiles API</strong> are enabled in Google Cloud Console for your API key.</p>
          <button
            onClick={() => { setIs3DMode(false); setTilt(0); setHeading(0); }}
            className="mt-2 px-5 py-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition"
          >
            Back to 2D Map
          </button>
        </div>
      )}

      {/* 3. Google Earth 3D Mode Notice Banner */}
      {is3DMode && !is3DLoading && !map3DError && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[500] hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full aurora-glass-card border border-white/20 text-[11px] text-slate-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Google Earth 3D Active &bull; Hold <kbd className="px-1 py-0.5 rounded bg-white/20 font-mono text-[9px] text-white">Shift</kbd> + Drag mouse to tilt & rotate</span>
        </div>
      )}

      {/* 3b. Smoke simulation status: honest labelling for example data */}
      {showSmoke && nationalMode === "off" && (
        <div
          className="absolute top-36 sm:top-24 right-2 sm:right-4 z-[900] max-w-[min(340px,calc(100%-1rem))] rounded-2xl px-3 py-2 aurora-glass-card border border-white/15 shadow-2xl text-[11px] leading-snug text-slate-200"
          role="status"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <strong className="text-white">
              {lang === "id" ? "Simulasi asap" : "Smoke simulation"} · {hazard === "volcano" ? volcanoName(smokeEngine.scenario.label, lang) : forestName(smokeEngine.scenario.label, lang)}
            </strong>
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-300/60 text-amber-200">
              {lang === "id" ? "Data contoh" : "Example data"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="font-mono text-[10px] text-slate-300">
              {lang === "id" ? "Angin" : "Wind"} {smokeWind.speed.toLocaleString(lang === "id" ? "id-ID" : "en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m/s {lang === "id" ? "dari" : "from"} {compassLabel(smokeWind.from, lang)} · T+{currentHour}{lang === "id" ? " jam" : "h"}
            </span>
            {!is3DMode && (
              <button
                type="button"
                onClick={() => {
                  smokeEngine.advanceTo(currentHour);
                  // Leave room for the controller dock (left) and the timeline (bottom) on wide screens.
                  const wide = window.innerWidth >= 640;
                  mapRef.current?.flyToBounds(smokeEngine.extent(), {
                    paddingTopLeft: wide ? [360, 110] : [24, 110],
                    paddingBottomRight: wide ? [60, 150] : [24, 170],
                    maxZoom: 10,
                    duration: 1.0
                  });
                }}
                className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                {lang === "id" ? "Fokus ke asap" : "Zoom to smoke"}
              </button>
            )}
          </div>
          {mapStyle === "exposure" && (
            <div className="flex items-center gap-2.5 flex-wrap mt-1 text-[10px] text-slate-300">
              {[lang === "id" ? "Ringan" : "Light", lang === "id" ? "Sedang" : "Moderate", lang === "id" ? "Pekat" : "Heavy"].map((label, i) => (
                <span key={label} className="flex items-center gap-1">
                  <i className="inline-block w-2.5 h-2.5 rounded-[2px]" style={{ background: EXPOSURE_TIER_COLORS[i] }} />
                  {label}
                </span>
              ))}
              <span className="text-slate-400">{lang === "id" ? "(kepadatan relatif)" : "(relative density)"}</span>
            </div>
          )}
          {is3DMode && smoke3DError && (
            <div className="text-[10px] text-rose-300 mt-0.5">{smoke3DError}</div>
          )}
          <div className="text-[10px] text-slate-400 mt-0.5">
            {tr("Not an official warning. Follow BMKG, PVMBG and your local BPBD.", "Bukan peringatan resmi. Ikuti arahan BMKG, PVMBG, dan BPBD setempat.")}
          </div>
        </div>
      )}

      {/* 4. Camera and coordinates readout */}
      <CameraReadout map={mapInstance} lang={lang} />

      {/* 5. Panel Lapisan Spasial Aktif (Kiri Bawah) */}
      {!isLayerPanelOpen ? (
        <button
          onClick={() => setIsLayerPanelOpen(true)}
          className="absolute bottom-20 left-2 sm:bottom-6 sm:left-4 z-[500] w-10 h-10 rounded-2xl shadow-2xl flex items-center justify-center transition cursor-pointer active:scale-95 group aurora-glass-card"
          title={tr("Show spatial layers", "Tampilkan lapisan spasial")}
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
            <input type="checkbox" checked={showForests} onChange={(e) => setShowForests(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#14532d" stroke="#bbf7d0" strokeWidth="1.5" /><path d="M12 4.5l4.5 6.2h-2.4l3.4 4.6H13v3.2h-2v-3.2H6.5l3.4-4.6H7.5z" fill="#bbf7d0" /></svg>
            <span>{lang === "id" ? "Hutan rawan api" : "Fire-prone forests"}</span>
          </label>
          
          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <img src="/titik_api.png" className="w-4 h-4 object-contain" />
            <span>{lang === "id" ? "Titik Panas NASA FIRMS" : "NASA FIRMS Hotspots"}</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showAshPaths} onChange={(e) => setShowAshPaths(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <i className="inline-block w-4 border-t-2 border-dashed shrink-0" style={{ borderColor: "#c4b5fd" }} aria-hidden="true" />
            <span>{lang === "id" ? "Jalur abu erupsi (72 jam)" : "Eruption ash paths (72 h)"}</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showPlume} onChange={(e) => setShowPlume(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(253, 183, 115, 0.3)", border: "1px dashed #FDB773" }}></div>
            <span>{lang === "id" ? "Peluang Sebaran (Ensemble)" : "Dispersion Probability"}</span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showSmoke} onChange={(e) => setShowSmoke(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <div className="w-4 h-4 rounded-full shrink-0" style={{ background: "radial-gradient(circle, rgba(150,140,130,0.95), rgba(150,140,130,0.15))" }}></div>
            <span>{lang === "id" ? "Simulasi Asap" : "Smoke Simulation"}</span>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border border-amber-300/50 text-amber-200">
              {lang === "id" ? "Contoh" : "Example"}
            </span>
          </label>

          <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer hover:opacity-80 transition select-none">
            <input type="checkbox" checked={showAirports} onChange={(e) => setShowAirports(e.target.checked)} className="w-3.5 h-3.5 accent-emerald-400" />
            <img src="/plane.png" className="w-4 h-4 object-contain" />
            <span>{lang === "id" ? "Bandara Udara" : "Airports"}</span>
          </label>

          {nearbyStats && (
            <p className="pt-2 mt-0.5 border-t border-white/10 text-[10px] leading-snug text-slate-300 max-w-[240px]" role="status">
              {lang === "id"
                ? `Ditampilkan dalam radius ${nearbyStats.radiusKm} km dari tengah peta: ${nearbyStats.volcanoes} gunung, ${nearbyStats.forests} hutan, ${nearbyStats.hotspots.toLocaleString("id-ID")} titik api, ${nearbyStats.ashPaths} jalur abu. Gunung Level III–IV selalu tampil.`
                : `Showing within ${nearbyStats.radiusKm} km of the map centre: ${nearbyStats.volcanoes} volcanoes, ${nearbyStats.forests} forests, ${nearbyStats.hotspots.toLocaleString("en-US")} hotspots, ${nearbyStats.ashPaths} ash paths. Level III–IV volcanoes always show.`}
            </p>
          )}
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

      {/* Map style switch, plus scale bar and north arrow on the exposure map */}
      <div className="absolute bottom-44 right-2 sm:bottom-[5.5rem] sm:right-4 z-[500] flex flex-col items-end gap-2">
        <NationalModes map={mapInstance} lang={lang} onModeChange={setNationalMode} />
        {mapStyle === "exposure" && <ScaleBar map={mapInstance} lang={lang} />}
        <div className="flex rounded-full p-0.5 aurora-glass-card border border-white/20 shadow-2xl" role="group" aria-label={lang === "id" ? "Gaya peta" : "Map style"}>
          {([
            ["exposure", MapIcon, lang === "id" ? "Paparan" : "Exposure"],
            ["satellite", Satellite, lang === "id" ? "Satelit" : "Satellite"]
          ] as const).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mapStyle === value}
              aria-label={label}
              title={label}
              onClick={() => setMapStyle(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300 ${
                mapStyle === value ? "bg-emerald-500/40 text-white" : "text-slate-300 hover:bg-white/10"
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* GOOGLE EARTH-STYLE FLOATING SUITE CONTROL DOCK (Kanan Bawah - Gambar 1 & 2) */}
      <div className="absolute bottom-20 right-2 sm:bottom-8 sm:right-4 flex items-center gap-2 z-[500]">
        {/* Container Tombol Bulat Khas Google Earth */}
        <div className="flex items-center gap-1.5 p-1 rounded-full aurora-glass-card shadow-2xl border border-white/20">
          {/* 1. Street View Pegman Icon Button */}
          <button
            type="button"
            onClick={handleOpenStreetView}
            className="w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer hover:scale-110 active:scale-95 bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md"
            title={tr("Show Street View (Google Maps 360° viewer)", "Tampilkan Street View (penampil 360° Google Maps)")}
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
            title={tr("Show your location (GPS)", "Tampilkan lokasi Anda (GPS)")}
          >
            <LocateFixed className={`w-4 h-4 ${isLocating ? "animate-spin" : ""}`} />
          </button>

          {/* 3. 2D / 3D Mode Toggle Button (hidden while CONFIG.FEATURES.MAP_3D is off) */}
          {CONFIG.FEATURES.MAP_3D && (<>
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
          </>)}
        </div>

        {/* 5. Combined Zoom Control Pill (- / +) */}
        <div
          className="flex items-center rounded-full overflow-hidden shadow-2xl aurora-glass-card border border-white/20"
        >
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="w-8 h-9 flex items-center justify-center transition cursor-pointer active:scale-95 hover:bg-white/10 text-white border-r border-white/10"
            title={tr("Zoom out", "Perkecil peta")}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="w-8 h-9 flex items-center justify-center transition cursor-pointer active:scale-95 hover:bg-white/10 text-white"
            title={tr("Zoom in", "Perbesar peta")}
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
                  <h3 className="text-sm font-extrabold text-white">{tr("Interactive Google Street View 360°", "Google Street View 360° Interaktif")}</h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    {tr("Coordinates", "Koordinat")}: {streetViewCoords[0].toFixed(4)}, {streetViewCoords[1].toFixed(4)}
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
                title={tr("Google Street View panorama", "Panorama Google Street View")}
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
                {tr("Drag inside the panorama to look around the location in 360°.", "Seret tetikus pada jendela panorama untuk melihat sekeliling lokasi secara 360°.")}
              </span>
              <button
                onClick={() => setIsStreetViewOpen(false)}
                className="px-4 py-1 rounded-full aurora-btn text-xs font-bold"
              >
                {tr("Close viewer", "Tutup penampil")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
