import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPosition, RoutePoint } from '../types/domain';

/**
 * Apenas OpenStreetMap — 100 % gratuito, sem chave nem limite comercial.
 * O tema escuro vem de um filtro CSS (ver .dark-map-container em index.css),
 * evitando depender de provedores pagos de tiles escuros.
 */
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_OPTIONS: L.TileLayerOptions = {
  maxZoom: 19,
  subdomains: 'abc',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
};

const DEFAULT_CENTER: RoutePoint = [-23.5874, -46.6576];
const FIT_THROTTLE_MS = 2500;

interface RouteMapInnerProps {
  routePoints?: RoutePoint[];
  currentPos?: GeoPosition | null;
  height?: string;
  live?: boolean;
}

function RouteMapInner({
  routePoints = [],
  currentPos = null,
  height = '200px',
  live = false,
}: RouteMapInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const lastFitRef = useRef(0);
  const lastPointCountRef = useRef(0);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return undefined;

    const first = routePoints[0];
    const center: RoutePoint = currentPos
      ? [currentPos.lat, currentPos.lon]
      : first ?? DEFAULT_CENTER;

    const map = L.map(container, {
      center,
      zoom: 16,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true, // canvas escala muito melhor com rotas longas
    });

    const layer = L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(map);
    let errorCount = 0;
    layer.on('tileerror', () => {
      errorCount += 1;
      // Um tile isolado pode falhar em qualquer rede; só alerta em falha sistêmica.
      if (errorCount >= 6) setTileError(true);
    });
    layer.on('tileload', () => {
      errorCount = 0;
      setTileError(false);
    });

    polylineRef.current = L.polyline([], {
      color: '#ff6d2e',
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    markerRef.current = L.marker(center, {
      icon: L.divIcon({
        className: '',
        html: '<span style="display:block;width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#ff6d2e,#ffb800);border:2px solid #fff;box-shadow:0 0 8px rgba(255,109,46,0.6);"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      keyboard: false,
    }).addTo(map);

    mapRef.current = map;

    // O mapa costuma montar dentro de um modal ainda animando: sem
    // invalidateSize o Leaflet calcula 0×0 e a área fica cinza.
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container);
    const initialFix = setTimeout(() => map.invalidateSize({ animate: false }), 250);

    return () => {
      clearTimeout(initialFix);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      polylineRef.current = null;
      markerRef.current = null;
    };
    // Executa uma única vez: as atualizações vivem no efeito abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const polyline = polylineRef.current;
    const marker = markerRef.current;
    if (!map || !polyline || !marker) return;

    if (routePoints.length > 0) {
      polyline.setLatLngs(routePoints);

      const now = Date.now();
      const grew = routePoints.length > lastPointCountRef.current;
      lastPointCountRef.current = routePoints.length;

      if (routePoints.length >= 2) {
        // Durante o rastreamento ao vivo, refazer o enquadramento a cada ponto
        // causa tremulação — limita a uma vez a cada 2,5 s.
        if (!grew || now - lastFitRef.current > FIT_THROTTLE_MS) {
          map.fitBounds(L.latLngBounds(routePoints), {
            padding: [20, 20],
            maxZoom: 17,
            animate: true,
          });
          lastFitRef.current = now;
        } else if (currentPos) {
          map.panTo([currentPos.lat, currentPos.lon], { animate: true });
        }
      } else {
        map.setView(routePoints[0], 16);
      }
    }

    if (currentPos) {
      const latLng: RoutePoint = [currentPos.lat, currentPos.lon];
      marker.setLatLng(latLng);
      if (routePoints.length <= 1) map.panTo(latLng);
    }
  }, [routePoints, currentPos]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 glass-panel shadow-card">
      <div className="dark-map-container">
        <div
          ref={containerRef}
          style={{ height }}
          className="relative w-full z-0 bg-[#0a0a0f]"
          role="img"
          aria-label={`Mapa da rota com ${routePoints.length} pontos registrados`}
        />
      </div>

      {tileError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#0a0a0f]/95 z-[500] pointer-events-none">
          <span className="text-3xl" aria-hidden="true">
            🗺️
          </span>
          <span className="text-white text-sm font-semibold">Mapa indisponível offline</span>
          <span className="text-slate-400 text-xs">A rota continua sendo gravada normalmente</span>
        </div>
      )}

      {live && (
        <div className="absolute top-2 right-2 z-[500] px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-[#ff6d2e] flex items-center gap-1 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff6d2e] animate-ping" aria-hidden="true" />
          Rastreamento ao vivo
        </div>
      )}
    </div>
  );
}

export default RouteMapInner;
