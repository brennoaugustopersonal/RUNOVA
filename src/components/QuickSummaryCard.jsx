import React from 'react';
import { Activity, Clock, Flame, Navigation, ArrowUpRight } from 'lucide-react';
import { formatDistance, formatPace, formatTime, formatDate } from '../utils/formatters';

function QuickSummaryCardFn({ stats, onOpenSetup }) {
  const { totalDistanceKm, avgPaceMinKm, totalRuns, lastRun } = stats;

  return (
    <div className="space-y-4">
      {/* Principal Card: Resumo Geral */}
      <div className="relative overflow-hidden rounded-3xl p-6 glass-panel border border-white/10 shadow-card">
        {/* Fundo sutil com gradiente */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#ff6d2e]/20 via-[#ffb800]/10 to-transparent blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#ff6d2e]/10 border border-[#ff6d2e]/20 text-[#ff6d2e]">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Desempenho Geral
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
            {totalRuns} {totalRuns === 1 ? 'corrida' : 'corridas'}
          </span>
        </div>

        {/* Métricas Principais em Destaque */}
        <div className="grid grid-cols-2 gap-4 my-2">
          {/* Total KM */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Distância Total</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-white">
                {formatDistance(totalDistanceKm, 1)}
              </span>
              <span className="text-sm font-bold text-[#ff6d2e]">km</span>
            </div>
          </div>

          {/* Ritmo Médio */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Ritmo Médio</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {formatPace(avgPaceMinKm)}
              </span>
              <span className="text-xs font-semibold text-slate-400">/km</span>
            </div>
          </div>
        </div>

        {/* Botão de Ação Rápida */}
        <button
          onClick={onOpenSetup}
          className="w-full mt-4 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 font-extrabold text-sm tracking-wide shadow-glow hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <span>CONFIGURAR NOVA CORRIDA</span>
          <ArrowUpRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>

      {/* Card da Última Corrida */}
      {lastRun && (
        <div className="rounded-2xl p-4 glass-panel border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-[#ffb800]">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-200">Última Sessão</p>
                <span className="text-[10px] text-slate-400">{formatDate(lastRun.date)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDistance(lastRun.distanceKm)} km • {formatTime(lastRun.durationSeconds)} • {formatPace(lastRun.paceMinKm)}/km
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[#ffb800] text-xs font-semibold">
            <Flame className="w-3.5 h-3.5" />
            <span>{lastRun.calories} kcal</span>
          </div>
        </div>
      )}
    </div>
  );
}

export const QuickSummaryCard = React.memo(QuickSummaryCardFn);
