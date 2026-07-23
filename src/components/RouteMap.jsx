import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function RouteMap({ routePoints = [], currentPos = null, height = '200px' }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polylineRef = useRef(null);
  const markerRef = useRef(null);

  // Posição inicial padrão (ex: Parque Ibirapuera / Centro São Paulo se não houver GPS)
  const defaultPos = [-23.5874, -46.6576];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = currentPos?.lat || (routePoints[0] ? routePoints[0][0] : defaultPos[0]);
      const initialLng = currentPos?.lon || (routePoints[0] ? routePoints[0][1] : defaultPos[1]);

      // Cria a instância do mapa com Leaflet
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Aplica Tile Layer CartoDB Dark Matter para o tema escuro profundo do RUNOVA
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      // Linha Neon Laranja-Amarela da Rota
      const polyline = L.polyline([], {
        color: '#ff6d2e',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Ícone Customizado de Posição Laranja
      const customIcon = L.divIcon({
        className: 'custom-gps-marker',
        html: `<div class="w-4 h-4 rounded-full bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] border-2 border-white shadow-glow animate-pulse"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([initialLat, initialLng], { icon: customIcon }).addTo(map);

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

  // Atualiza a Rota e Posição
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const polyline = polylineRef.current;
    const marker = markerRef.current;

    if (routePoints && routePoints.length > 0) {
      polyline.setLatLngs(routePoints);
      const bounds = L.latLngBounds(routePoints);
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 17 });
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
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0 bg-[#0a0a0f]" />
      
      {/* Visual Overlay Tag */}
      <div className="absolute top-2 right-2 z-10 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-bold text-[#ff6d2e] flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff6d2e] animate-ping" />
        <span>Rastreamento GPS</span>
      </div>
    </div>
  );
}
