import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_CONFIGS = [
  {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    },
  },
  {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      maxZoom: 19,
      subdomains: 'abc',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
];

function RouteMapInner({
  routePoints = [],
  currentPos = null,
  height = '200px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const fallbackIndexRef = useRef(0);
  const isFallbackingRef = useRef(false);
  const [mapError, setMapError] = useState(false);

  const defaultPos = [-23.5874, -46.6576];

  function applyFallback(map, configIndex) {
    if (configIndex >= TILE_CONFIGS.length) {
      setMapError(true);
      return;
    }
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const config = TILE_CONFIGS[configIndex];
    const layer = L.tileLayer(config.url, config.options).addTo(map);
    tileLayerRef.current = layer;
    fallbackIndexRef.current = configIndex;
    isFallbackingRef.current = false;
    layer.on('tileerror', () => {
      if (isFallbackingRef.current) return;
      isFallbackingRef.current = true;
      applyFallback(map, configIndex + 1);
    });
  }

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat =
        currentPos?.lat ||
        (routePoints[0] ? routePoints[0][0] : defaultPos[0]);
      const initialLng =
        currentPos?.lon ||
        (routePoints[0] ? routePoints[0][1] : defaultPos[1]);

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: true,
      });

      applyFallback(map, 0);

      const polyline = L.polyline([], {
        color: '#ff6d2e',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      const customIcon = L.divIcon({
        className: '',
        html: '<div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#ff6d2e,#ffb800);border:2px solid #fff;box-shadow:0 0 8px rgba(255,109,46,0.6);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: customIcon,
      }).addTo(map);

      mapInstanceRef.current = map;
      polylineRef.current = polyline;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const polyline = polylineRef.current;
    const marker = markerRef.current;

    if (routePoints && routePoints.length > 0) {
      polyline.setLatLngs(routePoints);
      if (routePoints.length >= 2) {
        const bounds = L.latLngBounds(routePoints);
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 17 });
      } else {
        map.setView(routePoints[0], 16);
      }
    }

    if (currentPos && currentPos.lat && currentPos.lon) {
      const latLng = [currentPos.lat, currentPos.lon];
      marker.setLatLng(latLng);
      if (!routePoints || routePoints.length <= 1) {
        map.panTo(latLng);
      }
    }
  }, [routePoints, currentPos]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 glass-panel shadow-card">
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="relative w-full z-0 bg-[#0a0a0f]"
      >
        {mapError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] z-[1000]">
            <span className="text-3xl mb-2">⚠️</span>
            <span className="text-white text-sm font-semibold">
              Mapa indisponível
            </span>
            <span className="text-gray-400 text-xs mt-1">
              Verifique sua conexão de internet
            </span>
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-[#ff6d2e] flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff6d2e] animate-ping" />
        <span>Rastreamento GPS</span>
      </div>
    </div>
  );
}

export default RouteMapInner;
