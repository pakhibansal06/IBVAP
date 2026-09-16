import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, MapPin } from 'lucide-react';

export default function LiveMap({ cameras, activeTargets, onSelectCamera }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef([]);

  // Truly 100% Free Public Map Layers (NO API Key, NO Watermarks!)
  const TILE_LAYERS = {
    OSM_STANDARD: {
      name: 'OpenStreetMap (Standard Free - Recommended)',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    ESRI_DARK: {
      name: 'Esri Dark Canvas (Tactical Dark - No Key)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    },
    ESRI_SATELLITE: {
      name: 'Esri Satellite Imagery (Surveillance Satellite)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Source: Esri, Maxar, Earthstar Geographics'
    }
  };

  const [activeTile, setActiveTile] = useState('OSM_STANDARD');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [31.6280, 74.8840],
        zoom: 13,
        zoomControl: true,
        attributionControl: false
      });

      const initialLayer = TILE_LAYERS[activeTile];
      tileLayerRef.current = L.tileLayer(initialLayer.url, {
        maxZoom: 19,
        attribution: initialLayer.attribution
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers & overlays
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Render Restricted Zone Polygon across border perimeter
    const zonePolygonCoords = [
      [31.6210, 74.8720],
      [31.6280, 74.8840],
      [31.6385, 74.9010],
      [31.6350, 74.9050],
      [31.6200, 74.8760]
    ];
    const polygon = L.polygon(zonePolygonCoords, {
      color: '#e11d48',
      weight: 2,
      dashArray: '5, 5',
      fillColor: '#f43f5e',
      fillOpacity: 0.25
    }).addTo(map);
    polygon.bindTooltip("RESTRICTED BORDER SECURITY ZONE A", { permanent: true, className: "bg-slate-900 text-rose-400 font-bold border-rose-500/40 text-xs px-2 py-1" });
    markersRef.current.push(polygon);

    // Render Virtual Optical Fence Line
    const fenceCoords = [
      [31.6200, 74.8700],
      [31.6400, 74.9030]
    ];
    const fencePolyline = L.polyline(fenceCoords, {
      color: '#eab308',
      weight: 3,
      dashArray: '8, 8'
    }).addTo(map);
    markersRef.current.push(fencePolyline);

    // Render Target Pursuit Trajectory (P102 Path: CAM-072 -> CAM-081)
    const targetPathCoords = [
      [31.6210, 74.8720], // CAM-072
      [31.6245, 74.8785], // CAM-081
      [31.6315, 74.8895]  // CAM-084
    ];
    const pathPolyline = L.polyline(targetPathCoords, {
      color: '#a855f7',
      weight: 4
    }).addTo(map);
    pathPolyline.bindTooltip("TARGET P102 PURSUIT PATH: CAM-072 → CAM-081 → CAM-084", { permanent: false, className: "bg-slate-900 text-purple-300 font-bold text-xs" });
    markersRef.current.push(pathPolyline);

    // Render 6 Camera Markers
    const defaultCams = [
      { code: 'CAM-072', name: 'Camera 1 - Nominal', lat: 31.6210, lng: 74.8720, isAlert: false },
      { code: 'CAM-081', name: 'Camera 2 - Person Detected', lat: 31.6245, lng: 74.8785, isAlert: true },
      { code: 'CAM-083', name: 'Camera 3 - Vehicle Detected', lat: 31.6280, lng: 74.8840, isAlert: true },
      { code: 'CAM-084', name: 'Camera 4 - Cycle Detected', lat: 31.6315, lng: 74.8895, isAlert: true },
      { code: 'CAM-085', name: 'Camera 5 - Person Detected', lat: 31.6350, lng: 74.8950, isAlert: true },
      { code: 'CAM-086', name: 'Camera 6 - Nominal', lat: 31.6385, lng: 74.9010, isAlert: false }
    ];

    const camList = cameras && cameras.length > 0 ? cameras : defaultCams;

    camList.forEach((cam) => {
      const isAlert = cam.isAlert || cam.code === 'CAM-072' || cam.code === 'CAM-081';
      const markerColor = isAlert ? '#f43f5e' : '#10b981';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            background: ${markerColor};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid #0f172a;
            box-shadow: 0 0 18px ${markerColor};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0f172a;
            font-weight: 900;
            font-size: 11px;
          ">
            ${cam.code.split('-')[1]}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([cam.latitude || cam.lat, cam.longitude || cam.lng], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="background: #0f172a; color: #f8fafc; padding: 10px; border-radius: 8px; font-family: sans-serif; min-width: 180px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: bold; color: ${markerColor};">${cam.code}: ${cam.name}</h4>
          <p style="margin: 4px 0; font-size: 11px; color: #94a3b8;">Coordinates: ${(cam.latitude || cam.lat).toFixed(4)}, ${(cam.longitude || cam.lng).toFixed(4)}</p>
          <div style="margin-top: 6px; font-size: 11px; font-weight: bold; color: ${markerColor};">STATUS: ${isAlert ? 'HIGH RISK ALERT' : 'SECTOR ONLINE'}</div>
        </div>
      `);

      marker.on('click', () => {
        if (onSelectCamera) onSelectCamera(cam.code);
      });

      markersRef.current.push(marker);
    });

  }, [cameras, activeTargets]);

  // Handle Tile Layer Switcher
  const handleSwitchTile = (key) => {
    setActiveTile(key);
    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      const layerConfig = TILE_LAYERS[key];
      tileLayerRef.current = L.tileLayer(layerConfig.url, {
        maxZoom: 19,
        attribution: layerConfig.attribution
      }).addTo(mapInstanceRef.current);
    }
  };

  return (
    <div className="bg-[#181f2c] rounded-2xl p-4 border border-[#263042] space-y-3 relative shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-sky-400 animate-pulse" />
          <h3 className="text-sm font-bold tracking-wider text-white uppercase">
            GEOSPATIAL BORDER SURVEILLANCE MAP
          </h3>
        </div>

        {/* Tile Layer Selector */}
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">Map Layer:</span>
          <select
            value={activeTile}
            onChange={(e) => handleSwitchTile(e.target.value)}
            className="bg-[#121620] border border-[#263042] rounded-lg px-2.5 py-1 text-xs text-sky-300 font-bold focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            {Object.keys(TILE_LAYERS).map((k) => (
              <option key={k} value={k}>
                {TILE_LAYERS[k].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-[460px] rounded-xl overflow-hidden border border-[#263042] shadow-inner z-0"
      />

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span>* Using Official Free OpenStreetMap (OSM) & Esri Tiles</span>
        <span className="text-emerald-400 font-bold">100% Free • Clean & No Watermarks</span>
      </div>
    </div>
  );
}
