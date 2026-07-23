import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Target, Clock, Zap, Play, Sparkles, Navigation, Gamepad2, Trash2 } from 'lucide-react';
import { formatPace } from '../utils/formatters';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_POS = [-23.5874, -46.6576];

function GpsWaypointMap({ waypoints, onAddWaypoint, onClearWaypoints }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_POS,
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e) => {
      onAddWaypoint([e.latlng.lat, e.latlng.lng]);
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.setView([position.coords.latitude, position.coords.longitude], 15);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 }
    );

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();
    waypoints.forEach(([lat, lng]) => {
      const icon = L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,#ff6d2e,#ffb800);border:2px solid #fff;box-shadow:0 0 8px rgba(255,109,46,0.6);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker([lat, lng], { icon }).addTo(markersLayerRef.current);
    });
  }, [waypoints]);

  return (
    <div className="space-y-2">
      <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 glass-panel">
        <div ref={mapContainerRef} style={{ height: '160px' }} className="w-full z-0 bg-[#0a0a0f]" />
        {waypoints.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <span className="text-[11px] font-semibold text-slate-400 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Toque no mapa para adicionar pontos à rota
            </span>
          </div>
        )}
      </div>
      {waypoints.length > 0 && (
        <button
          onClick={onClearWaypoints}
          className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Limpar Rota
        </button>
      )}
    </div>
  );
}

function SetupRunModalFn({ isOpen, onClose, onStartRun }) {
  const [distanceKm, setDistanceKm] = useState(2.1);
  const [durationMinutes, setDurationMinutes] = useState(12);
  const [mode, setMode] = useState('simulation');
  const [waypoints, setWaypoints] = useState([]);

  const handleAddWaypoint = useCallback((point) => {
    setWaypoints((prev) => [...prev, point]);
  }, []);

  const handleClearWaypoints = useCallback(() => {
    setWaypoints([]);
  }, []);

  if (!isOpen) return null;

  const expectedPaceMinKm = durationMinutes > 0 && distanceKm > 0 ? durationMinutes / distanceKm : 0;

  const handleStart = () => {
    onStartRun(distanceKm, durationMinutes, mode, waypoints);
    setWaypoints([]);
    onClose();
  };

  const quickDistances = [1.0, 2.1, 3.0, 5.0, 10.0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-all animate-fadeIn">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#0d0d14] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl space-y-5 overflow-hidden z-10">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] rounded-full my-2" />

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#ff6d2e]/20 to-[#ffb800]/20 text-[#ff6d2e]">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Configurar Meta</h2>
              <p className="text-xs text-slate-400">Defina a distância e o tempo alvo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Modo (Simulador vs GPS Real) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-white/5">
          <button
            type="button"
            onClick={() => setMode('simulation')}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              mode === 'simulation'
                ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Simulador 🎮</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('gps')}
            className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              mode === 'gps'
                ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>GPS Real 📡</span>
          </button>
        </div>

        {/* Mapa para seleção de rota (apenas modo GPS) */}
        {mode === 'gps' && (
          <GpsWaypointMap
            waypoints={waypoints}
            onAddWaypoint={handleAddWaypoint}
            onClearWaypoints={handleClearWaypoints}
          />
        )}

        {/* Atalhos Rápidos de Distância */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Distâncias Populares
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickDistances.map((dist) => (
              <button
                key={dist}
                onClick={() => setDistanceKm(dist)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                  distanceKm === dist
                    ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                    : 'bg-white/5 text-slate-300 border border-white/5 hover:bg-white/10'
                }`}
              >
                {dist} km
              </button>
            ))}
          </div>
        </div>

        {/* Distância Alvo */}
        <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Zap className="w-4 h-4 text-[#ff6d2e]" />
              <span className="text-sm font-semibold">Distância Alvo</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white font-mono">
                {distanceKm.toFixed(1)}
              </span>
              <span className="text-xs font-bold text-[#ff6d2e]">km</span>
            </div>
          </div>
          
          <input
            type="range"
            min="0.5"
            max="21.0"
            step="0.1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#ff6d2e]"
          />
        </div>

        {/* Tempo Alvo */}
        <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-[#ffb800]" />
              <span className="text-sm font-semibold">Tempo Alvo</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-white font-mono">
                {durationMinutes}
              </span>
              <span className="text-xs font-bold text-[#ffb800]">minutos</span>
            </div>
          </div>

          <input
            type="range"
            min="3"
            max="120"
            step="1"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#ffb800]"
          />
        </div>

        {/* Ritmo Requerido Calculado */}
        <div className="p-3.5 rounded-xl bg-[#ff6d2e]/10 border border-[#ff6d2e]/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#ff6d2e] font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Ritmo Alvo Necessário:</span>
          </div>
          <span className="text-sm font-extrabold text-white font-mono">
            {formatPace(expectedPaceMinKm)} /km
          </span>
        </div>

        {/* Botão de Iniciar */}
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 font-black text-base tracking-wider shadow-glow hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>INICIAR CORRIDA</span>
        </button>

      </div>
    </div>
  );
}

export const SetupRunModal = React.memo(SetupRunModalFn);
