import { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { formatPace, formatDate, distanceUnitLabel } from '../utils/formatters';
import { calculatePerformanceDiff } from '../utils/calculations';
import type { RunRecord, UnitSystem } from '../types/domain';

interface PerformanceChartProps {
  currentRun: RunRecord | null;
  historyRuns?: RunRecord[];
  units?: UnitSystem;
}

function PerformanceChartFn({
  currentRun,
  historyRuns = [],
  units = 'metric',
}: PerformanceChartProps) {
  const model = useMemo(() => {
    if (!currentRun) return null;

    const previousRuns = historyRuns.slice(0, 4).reverse();
    const chartRuns = [...previousRuns, currentRun];

    const avgPastPace =
      previousRuns.length > 0
        ? previousRuns.reduce((acc, r) => acc + (r.paceMinKm || 0), 0) / previousRuns.length
        : currentRun.paceMinKm;

    const paces = chartRuns.map((r) => r.paceMinKm || 6);
    const maxPace = Math.max(...paces) + 0.5;
    const minPace = Math.min(...paces) - 0.5;
    const range = maxPace - minPace;

    const heightFor = (pace: number) => {
      if (!pace || pace <= 0) return 30;
      if (range <= 0) return 70;
      // Escala invertida: ritmo menor = barra maior (mais rápido).
      return Math.min(100, Math.max(25, ((maxPace - pace) / range) * 100));
    };

    return {
      chartRuns,
      avgPastPace,
      heightFor,
      perfDiff: calculatePerformanceDiff(currentRun.paceMinKm, avgPastPace),
      hasHistory: previousRuns.length > 0,
    };
  }, [currentRun, historyRuns]);

  if (!model || !currentRun) return null;

  const unit = distanceUnitLabel(units);
  const { chartRuns, avgPastPace, heightFor, perfDiff, hasHistory } = model;

  return (
    <section className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
          <Award className="w-5 h-5 text-[#ffb800]" aria-hidden="true" />
          Comparativo de desempenho
        </h3>

        {hasHistory && (
          <span
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              perfDiff.isBetter
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
            }`}
          >
            {perfDiff.isBetter ? (
              <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {perfDiff.diffFormatted} {perfDiff.isBetter ? 'mais rápido' : 'mais lento'}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {hasHistory
          ? `Ritmo médio (min/${unit}) desta sessão comparado às anteriores.`
          : 'Complete mais corridas para desbloquear a comparação de evolução.'}
      </p>

      <div className="h-44 pt-6 pb-2 flex items-end justify-between gap-2 border-b border-white/10 relative">
        {hasHistory && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-white/20 z-0 pointer-events-none"
            style={{ bottom: `${heightFor(avgPastPace)}%` }}
          >
            <span className="absolute right-0 -top-4 text-[10px] text-slate-400 font-mono">
              Média {formatPace(avgPastPace, units)}
            </span>
          </div>
        )}

        {chartRuns.map((run, index) => {
          const isCurrent = run.id === currentRun.id || index === chartRuns.length - 1;
          return (
            <div
              key={run.id ?? index}
              className="flex-1 flex flex-col items-center gap-2 z-10 min-w-0"
              title={`${formatDate(run.date)} — ${formatPace(run.paceMinKm, units)}/${unit}`}
            >
              <span
                className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-[#ff6d2e]' : 'text-slate-400'}`}
              >
                {formatPace(run.paceMinKm, units)}
              </span>

              <div className="w-full max-w-[36px] h-32 bg-slate-800/40 rounded-xl overflow-hidden flex items-end p-1">
                <div
                  style={{ height: `${heightFor(run.paceMinKm)}%` }}
                  className={`w-full rounded-lg transition-all duration-700 ${
                    isCurrent
                      ? 'bg-gradient-to-t from-[#ff6d2e] to-[#ffb800] shadow-glow'
                      : 'bg-slate-700'
                  }`}
                />
              </div>

              <span
                className={`text-[10px] font-medium truncate max-w-full ${
                  isCurrent ? 'text-[#ffb800] font-bold' : 'text-slate-500'
                }`}
              >
                {isCurrent ? 'Atual' : `-${chartRuns.length - 1 - index}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export const PerformanceChart = memo(PerformanceChartFn);
