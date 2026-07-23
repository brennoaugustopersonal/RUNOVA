import React from 'react';
import { X, Navigation, Clock, Flame, Gauge, Calendar } from 'lucide-react';
import { formatTime, formatPace, formatDistance, formatDate } from '../utils/formatters';
import { PerformanceChart } from './PerformanceChart';
import { RouteMap } from './RouteMap';
import { KmSplitsTable } from './KmSplitsTable';

export function RunDetailsModal({ run, allRuns = [], onClose }) {
  if (!run) return null;

  const { routePoints = [], splits = [] } = run;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-[#0d0d14] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#ff6d2e]/10 text-[#ff6d2e] border border-[#ff6d2e]/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Detalhes da Sessão</h3>
              <p className="text-xs text-slate-400">{formatDate(run.date)}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mapa da Rota */}
        {routePoints.length > 0 && (
          <RouteMap routePoints={routePoints} height="180px" />
        )}

        {/* Métricas Principais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Navigation className="w-3.5 h-3.5 text-[#ff6d2e]" />
              <span>Distância</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {formatDistance(run.distanceKm, 2)} <span className="text-xs text-[#ff6d2e]">km</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#ffb800]" />
              <span>Tempo</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {formatTime(run.durationSeconds)}
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <span>Ritmo Médio</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {formatPace(run.paceMinKm)} <span className="text-xs text-slate-400">/km</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Calorias</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {run.calories} <span className="text-xs text-slate-400">kcal</span>
            </div>
          </div>
        </div>

        {/* Splits por Km */}
        {splits.length > 0 && <KmSplitsTable splits={splits} />}

        {/* Gráfico Comparativo */}
        <PerformanceChart currentRun={run} historyRuns={allRuns.filter((r) => r.id !== run.id)} />

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all"
        >
          FECHAR
        </button>

      </div>
    </div>
  );
}
