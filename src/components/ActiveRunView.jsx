import React, { useState } from 'react';
import { Pause, Play, Square, Flame, Gauge, Navigation, FastForward, Heart, Volume2, VolumeX, MapPin, Activity, Bluetooth, BluetoothConnected, Radio, Zap, Crosshair } from 'lucide-react';
import { formatTime, formatPace, formatDistance, formatSpeed } from '../utils/formatters';
import { voiceService } from '../services/voiceService';
import { RouteMap } from './RouteMap';
import { getMetricConfidence } from '../services/physioEstimation';

function ActiveRunViewFn({ runState, onPause, onResume, onFinish, onToggleSpeed, onConnectBluetoothHr, onDisconnectBluetoothHr, bluetoothConnected }) {
  const [isMuted, setIsMuted] = useState(voiceService.muted);
  const [activeViewMode, setActiveViewMode] = useState('ring');
  const [btConnecting, setBtConnecting] = useState(false);

  if (!runState) return null;

  const {
    elapsedSeconds,
    currentDistanceKm,
    targetDistanceKm,
    currentPaceMinKm,
    speedKmh,
    calories,
    progressPercent,
    status,
    speedMultiplier,
    heartRateBpm,
    cadenceSpm,
    routePoints,
    lastPosition,
    mode,
  } = runState;

  const isPaused = status === 'paused';

  const toggleVoiceMute = () => {
    const mutedState = voiceService.toggleMute();
    setIsMuted(mutedState);
  };

  // Dual SVG Ring Parameters
  const strokeWidth = 12;
  const outerRadius = 110;
  const innerRadius = 90;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  
  const outerDashoffset = outerCircumference - (progressPercent / 100) * outerCircumference;
  
  const MIN_PACE = 2.0;
  const MAX_PACE = 10.0;
  const paceRange = MAX_PACE - MIN_PACE;
  const pacePercent = Math.min(100, Math.max(0, ((MAX_PACE - currentPaceMinKm) / paceRange) * 100));
  const innerDashoffset = innerCircumference - (pacePercent / 100) * innerCircumference;

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] flex flex-col justify-between p-5 overflow-y-auto select-none animate-fadeIn">
      
      {/* Glow de fundo */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] bg-gradient-to-tr from-[#ff6d2e]/20 via-[#ffb800]/15 to-transparent rounded-full blur-[95px] pointer-events-none" />

      {/* Top Header Controls */}
      <div className="relative z-10 flex items-center justify-between">
        
        {/* Status Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-[#ff6d2e] font-semibold border border-[#ff6d2e]/20">
          <div className="w-2 h-2 rounded-full bg-[#ff6d2e] animate-ping" />
          <span>{isPaused ? 'EM PAUSA' : mode === 'gps' ? 'GPS AO VIVO 📡' : 'SIMULADOR 🎮'}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute Voice Toggle */}
          <button
            onClick={toggleVoiceMute}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
            title={isMuted ? 'Ativar Áudio de Voz' : 'Silenciar Áudio de Voz'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#ffb800]" />}
          </button>

          {/* Bluetooth Heart Rate */}
          {typeof navigator !== 'undefined' && 'bluetooth' in navigator && (
            <button
              onClick={async () => {
                if (bluetoothConnected) {
                  if (onDisconnectBluetoothHr) onDisconnectBluetoothHr();
                } else {
                  setBtConnecting(true);
                  try {
                    if (onConnectBluetoothHr) await onConnectBluetoothHr();
                  } catch (e) {
                    console.warn('Bluetooth HR:', e.message);
                  }
                  setBtConnecting(false);
                }
              }}
              className={`p-2.5 rounded-full border transition-all ${
                bluetoothConnected
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-glow'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
              title={bluetoothConnected ? 'Desconectar Monitor Cardíaco' : 'Conectar Monitor Cardíaco Bluetooth'}
            >
              {btConnecting ? (
                <Activity className="w-4 h-4 animate-pulse" />
              ) : bluetoothConnected ? (
                <BluetoothConnected className="w-4 h-4" />
              ) : (
                <Bluetooth className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Toggle Speed Multiplier */}
          {mode === 'simulation' && (
            <button
              onClick={onToggleSpeed}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
            >
              <FastForward className="w-3.5 h-3.5 text-[#ffb800]" />
              <span>{speedMultiplier}x</span>
            </button>
          )}

          {/* Tab Map/Ring toggle */}
          <button
            onClick={() => setActiveViewMode(activeViewMode === 'ring' ? 'map' : 'ring')}
            className={`p-2.5 rounded-full border transition-all ${
              activeViewMode === 'map'
                ? 'bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] text-slate-950 border-transparent shadow-glow'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <MapPin className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Center View: Dual Concentric SVG Ring OR Interactive Map */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-4">
        
        {activeViewMode === 'map' ? (
          <div className="w-full max-w-sm space-y-2">
            <RouteMap routePoints={routePoints} currentPos={lastPosition} height="260px" />
            <p className="text-center text-[11px] text-slate-400 font-medium">
              Rota em tempo real • {routePoints.length} pontos gravados
            </p>
          </div>
        ) : (
          <div className="relative w-[270px] h-[270px] flex items-center justify-center">
            
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
              <defs>
                <linearGradient id="ringDistGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6d2e" />
                  <stop offset="100%" stopColor="#ffb800" />
                </linearGradient>

                <linearGradient id="ringPaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>

              {/* Anel Externo - Progresso de Distância */}
              <circle cx="130" cy="130" r={outerRadius} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={strokeWidth} fill="transparent" />
              <circle
                cx="130"
                cy="130"
                r={outerRadius}
                stroke="url(#ringDistGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={outerCircumference}
                strokeDashoffset={outerDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500 ease-out animate-ring-glow"
              />

              {/* Anel Interno - Indicador de Ritmo Alvo */}
              <circle cx="130" cy="130" r={innerRadius} stroke="rgba(255, 255, 255, 0.03)" strokeWidth={6} fill="transparent" />
              <circle
                cx="130"
                cy="130"
                r={innerRadius}
                stroke="url(#ringPaceGrad)"
                strokeWidth={6}
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-500 opacity-80"
              />
            </svg>

            {/* Conteúdo Central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-1">
              <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                Tempo Decorrido
              </span>
              <span className="text-4xl font-black text-white font-mono tracking-tight">
                {formatTime(elapsedSeconds)}
              </span>
              
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-[#ff6d2e]">
                <span>{progressPercent.toFixed(0)}% concluído</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Telemetria Pro (BPM + Cadência SPM) */}
      <div className="relative z-10 grid grid-cols-2 gap-3 mb-3">
        {/* Heart Rate BPM */}
        <div className="p-3.5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <Heart className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Batimentos</p>
              <p className="text-lg font-black text-white font-mono">{heartRateBpm} <span className="text-xs text-rose-400 font-normal">BPM</span></p>
            </div>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
            bluetoothConnected
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}>
            {bluetoothConnected ? 'REAL' : 'EST'}
          </span>
        </div>

        {/* Cadence SPM */}
        <div className="p-3.5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Cadência</p>
              <p className="text-lg font-black text-white font-mono">{cadenceSpm} <span className="text-xs text-amber-400 font-normal">SPM</span></p>
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
            EST
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="relative z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                getMetricConfidence('currentPace', mode) === 'measured' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Ritmo Atual</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {formatPace(currentPaceMinKm)}
              <span className="text-xs font-normal text-slate-400 ml-1">/km</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                getMetricConfidence('distance', mode) === 'measured' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Distância</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {formatDistance(currentDistanceKm, 2)}
              <span className="text-xs font-bold text-[#ff6d2e] ml-1">/ {targetDistanceKm} km</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                getMetricConfidence('speed', mode) === 'measured' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Velocidade</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {formatSpeed(speedKmh)}
              <span className="text-xs font-normal text-slate-400 ml-1">km/h</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                getMetricConfidence('calories', mode) === 'calculated' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Calorias</span>
            </div>
            <div className="text-xl font-black text-white font-mono">
              {calories}
              <span className="text-xs font-normal text-slate-400 ml-1">kcal</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={isPaused ? onResume : onPause}
            className={`flex-1 py-4 rounded-2xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isPaused
                ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                : 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-5 h-5 fill-slate-950" />
                <span>CONTINUAR</span>
              </>
            ) : (
              <>
                <Pause className="w-5 h-5 fill-white" />
                <span>PAUSAR</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (window.confirm('Tem certeza que deseja finalizar esta corrida?')) {
                onFinish();
              }
            }}
            className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 flex items-center justify-center active:scale-95 transition-all"
            title="Concluir e Salvar Corrida"
          >
            <Square className="w-5 h-5 fill-red-400" />
          </button>
        </div>

      </div>

    </div>
  );
}

export const ActiveRunView = React.memo(ActiveRunViewFn);
