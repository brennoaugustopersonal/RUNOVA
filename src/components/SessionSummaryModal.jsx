import React from 'react';
import { Trophy, CheckCircle2, Flame, Navigation, Clock, ArrowRight } from 'lucide-react';
import { formatTime, formatPace, formatDistance } from '../utils/formatters';
import { PerformanceChart } from './PerformanceChart';
import { HeartRateChart } from './HeartRateChart';
import { RouteMap } from './RouteMap';
import { KmSplitsTable } from './KmSplitsTable';

function SessionSummaryModalFn({ runData, historyRuns = [], onClose }) {
  if (!runData) return null;

  const {
    distanceKm,
    durationSeconds,
    paceMinKm,
    calories,
    completedGoal,
    routePoints = [],
    splits = [],
    heartRateHistory = [],
  } = runData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn overflow-y-auto">
      <div className="relative w-full max-w-md my-auto bg-[#0c0c12] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 overflow-hidden max-h-[90vh] overflow-y-auto">
        
        <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-[#ff6d2e]/30 via-[#ffb800]/20 to-transparent blur-3xl pointer-events-none" />

        {/* Header Celebration */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-1 shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0a0f] rounded-[22px] flex items-center justify-center">
              <Trophy className="w-8 h-8 text-[#ffb800] animate-bounce" />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white tracking-tight">
            {completedGoal ? 'Objetivo Concluído!' : 'Sessão Finalizada!'}
          </h2>
          <p className="text-xs text-slate-400">
            Excelente trabalho! Suas métricas foram salvas com sucesso.
          </p>
        </div>

        {/* Interactive Route Map */}
        {routePoints.length > 0 && (
          <RouteMap routePoints={routePoints} height="180px" />
        )}

        {/* Métricas Principais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Navigation className="w-3.5 h-3.5 text-[#ff6d2e]" />
              <span>Distância</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {formatDistance(distanceKm, 2)} <span className="text-xs text-[#ff6d2e]">km</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#ffb800]" />
              <span>Tempo</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {formatTime(durationSeconds)}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ritmo Médio</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {formatPace(paceMinKm)} <span className="text-xs text-slate-400">/km</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span>Calorias</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {calories} <span className="text-xs text-slate-400">kcal</span>
            </div>
          </div>
        </div>

        {/* Splits por Km */}
        {splits.length > 0 && <KmSplitsTable splits={splits} />}

        {/* Gráfico de Variação da Frequência Cardíaca */}
        {heartRateHistory.length > 0 && (
          <HeartRateChart heartRateHistory={heartRateHistory} durationSeconds={durationSeconds} />
        )}

        {/* Gráfico Comparativo de Desempenho */}
        <PerformanceChart currentRun={runData} historyRuns={historyRuns} />

        {/* Botão de Fechar */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 font-black text-sm tracking-wider shadow-glow hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span>VOLTAR AO INÍCIO</span>
          <ArrowRight className="w-4 h-4 stroke-[3]" />
        </button>

      </div>
    </div>
  );
}

export const SessionSummaryModal = React.memo(SessionSummaryModalFn);
