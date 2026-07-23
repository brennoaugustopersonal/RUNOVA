import React from 'react';
import { Pause, Play, Square, Flame, Gauge, Navigation, FastForward, Zap } from 'lucide-react';
import { formatTime, formatPace, formatDistance, formatSpeed } from '../utils/formatters';

export function ActiveRunView({ runState, onPause, onResume, onFinish, onToggleSpeed }) {
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
  } = runState;

  const isPaused = status === 'paused';

  // Parâmetros do Círculo de Progresso SVG
  const strokeWidth = 14;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] flex flex-col justify-between p-6 overflow-y-auto select-none animate-fadeIn">
      
      {/* Background radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-gradient-to-tr from-[#ff6d2e]/20 via-[#ffb800]/15 to-transparent rounded-full blur-[90px] pointer-events-none" />

      {/* Top Bar with Simulation Speed Control */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-[#ff6d2e] font-semibold border border-[#ff6d2e]/20">
          <div className="w-2 h-2 rounded-full bg-[#ff6d2e] animate-ping" />
          <span>{isPaused ? 'EM PAUSA' : 'CORRIDA ATIVA'}</span>
        </div>

        {/* Botão de aceleração para teste rápido */}
        <button
          onClick={onToggleSpeed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
          title="Alternar velocidade de simulação"
        >
          <FastForward className="w-3.5 h-3.5 text-[#ffb800]" />
          <span>Simulador: {speedMultiplier}x</span>
        </button>
      </div>

      {/* Center: Large Animated SVG Progress Ring with Timer */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto py-6">
        <div className="relative w-[270px] h-[270px] flex items-center justify-center">
          
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
            {/* Defs para Gradiente Laranja-Amarelo */}
            <defs>
              <linearGradient id="runovaRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6d2e" />
                <stop offset="100%" stopColor="#ffb800" />
              </linearGradient>
            </defs>

            {/* Círculo de Fundo Track */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              stroke="rgba(255, 255, 255, 0.06)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Círculo do Progresso Animado */}
            <circle
              cx="130"
              cy="130"
              r={radius}
              stroke="url(#runovaRingGradient)"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out animate-ring-glow"
            />
          </svg>

          {/* Conteúdo dentro do Anel */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">
              Tempo Decorrido
            </span>
            <span className="text-4xl font-black text-white font-mono tracking-tight">
              {formatTime(elapsedSeconds)}
            </span>
            
            <div className="flex items-center gap-1 mt-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-[#ff6d2e]">
              <span>{progressPercent.toFixed(0)}% concluído</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Real-time Live Metrics */}
      <div className="relative z-10 space-y-6">
        
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Ritmo Atual */}
          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Zap className="w-3.5 h-3.5 text-[#ff6d2e]" />
              <span>Ritmo Atual</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatPace(currentPaceMinKm)}
              <span className="text-xs font-normal text-slate-400 ml-1">/km</span>
            </div>
          </div>

          {/* Card 2: Distância Percorrida */}
          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Navigation className="w-3.5 h-3.5 text-[#ffb800]" />
              <span>Distância</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatDistance(currentDistanceKm, 2)}
              <span className="text-xs font-bold text-[#ff6d2e] ml-1">/ {targetDistanceKm} km</span>
            </div>
          </div>

          {/* Card 3: Velocidade */}
          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Velocidade</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {formatSpeed(speedKmh)}
              <span className="text-xs font-normal text-slate-400 ml-1">km/h</span>
            </div>
          </div>

          {/* Card 4: Calorias */}
          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Calorias</span>
            </div>
            <div className="text-2xl font-black text-white font-mono">
              {calories}
              <span className="text-xs font-normal text-slate-400 ml-1">kcal</span>
            </div>
          </div>
        </div>

        {/* Action Controls: Pause/Resume & Finish */}
        <div className="flex items-center gap-4">
          
          {/* Pause / Resume Button */}
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

          {/* Finish Button */}
          <button
            onClick={onFinish}
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
