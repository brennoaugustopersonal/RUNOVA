import React, { useState } from 'react';
import { History, Navigation, Clock, Flame, ChevronRight, Trophy } from 'lucide-react';
import { formatTime, formatPace, formatDistance, formatDate } from '../utils/formatters';

export function HistoryView({ runs = [], onSelectRun }) {
  if (!runs || runs.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
          <History className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Nenhuma corrida registrada ainda</p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Inicie sua primeira sessão para visualizar seu histórico e comparativos de desempenho.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#ff6d2e]" />
          <h2 className="text-base font-extrabold text-white">Histórico de Corridas</h2>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
          {runs.length} sessões
        </span>
      </div>

      {/* Lista de Corridas */}
      <div className="space-y-3">
        {runs.map((run) => (
          <div
            key={run.id}
            onClick={() => onSelectRun(run)}
            className="p-4 rounded-2xl glass-panel-interactive border border-white/5 flex items-center justify-between cursor-pointer group"
          >
            {/* Lado Esquerdo */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#ff6d2e]/20 to-[#ffb800]/20 border border-[#ff6d2e]/30 flex items-center justify-center text-[#ff6d2e]">
                <Navigation className="w-5 h-5" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white font-mono">
                    {formatDistance(run.distanceKm, 2)} <span className="text-xs text-[#ff6d2e]">km</span>
                  </span>
                  {run.completedGoal && (
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      Meta ⚡
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  {formatDate(run.date)}
                </p>
              </div>
            </div>

            {/* Lado Direito */}
            <div className="flex items-center gap-3">
              <div className="text-right space-y-0.5">
                <div className="flex items-center justify-end gap-1 text-xs font-mono font-bold text-slate-200">
                  <Clock className="w-3 h-3 text-[#ffb800]" />
                  <span>{formatTime(run.durationSeconds)}</span>
                </div>

                <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 font-mono">
                  <span>{formatPace(run.paceMinKm)}/km</span>
                  <span>•</span>
                  <span className="text-orange-400">{run.calories} kcal</span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
