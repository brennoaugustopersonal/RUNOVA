import React from 'react';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { formatPace, formatDate } from '../utils/formatters';
import { calculatePerformanceDiff } from '../utils/calculations';

export function PerformanceChart({ currentRun, historyRuns = [] }) {
  if (!currentRun) return null;

  // Monta lista com as últimas corridas + a corrida atual para o gráfico
  const previousRuns = historyRuns.slice(0, 4).reverse();
  const allChartRuns = [...previousRuns, { ...currentRun, isCurrent: true }];

  // Calcula a média das corridas anteriores para referência
  const avgPastPace = previousRuns.length > 0
    ? previousRuns.reduce((acc, r) => acc + (r.paceMinKm || 0), 0) / previousRuns.length
    : currentRun.paceMinKm;

  // Comparação da corrida atual vs média
  const perfDiff = calculatePerformanceDiff(currentRun.paceMinKm, avgPastPace);

  const allPaces = allChartRuns.map((r) => r.paceMinKm || 6.0);
  const maxPace = Math.max(...allPaces) + 0.5;
  const minPace = Math.min(...allPaces) - 0.5;

  const getBarHeightPercent = (pace) => {
    if (!pace || pace <= 0) return 30;
    // Invertemos a escala porque ritmo menor representa melhor velocidade
    const range = maxPace - minPace;
    if (range <= 0) return 70;
    const normalized = (maxPace - pace) / range;
    return Math.min(100, Math.max(25, normalized * 100));
  };

  return (
    <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 shadow-card">
      
      {/* Header com Badge de Desempenho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#ffb800]" />
          <h3 className="text-sm font-extrabold text-white">Comparativo de Desempenho</h3>
        </div>

        {/* Badge de Melhoria ou Piora */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
            perfDiff.isBetter
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
          }`}
        >
          {perfDiff.isBetter ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{perfDiff.diffFormatted} {perfDiff.isBetter ? 'Mais Rápido' : 'Mais Lento'}</span>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Comparação do ritmo médio (min/km) desta sessão com as corridas anteriores.
      </p>

      {/* Gráfico de Barras */}
      <div className="h-44 pt-6 pb-2 flex items-end justify-between gap-2 border-b border-white/10 relative">
        {/* Linha Guia de Média */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-white/20 z-0 pointer-events-none"
          style={{ bottom: `${getBarHeightPercent(avgPastPace)}%` }}
        >
          <span className="absolute right-0 -top-4 text-[10px] text-slate-400 font-mono">
            Média ({formatPace(avgPastPace)})
          </span>
        </div>

        {allChartRuns.map((run, index) => {
          const isCurrent = run.isCurrent;
          const heightPercent = getBarHeightPercent(run.paceMinKm);

          return (
            <div key={run.id || index} className="flex-1 flex flex-col items-center gap-2 z-10 group">
              
              {/* Tooltip Pace no Hover / Destaque */}
              <span className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-[#ff6d2e]' : 'text-slate-400'}`}>
                {formatPace(run.paceMinKm)}
              </span>

              {/* Barra */}
              <div className="w-full max-w-[36px] h-32 bg-slate-800/40 rounded-xl overflow-hidden flex items-end p-1">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-lg transition-all duration-700 ${
                    isCurrent
                      ? 'bg-gradient-to-t from-[#ff6d2e] to-[#ffb800] shadow-glow'
                      : 'bg-slate-700 group-hover:bg-slate-600'
                  }`}
                />
              </div>

              {/* Rótulo inferior */}
              <span className={`text-[10px] font-medium ${isCurrent ? 'text-[#ffb800] font-bold' : 'text-slate-500'}`}>
                {isCurrent ? 'Atual' : `Sessão ${index + 1}`}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
