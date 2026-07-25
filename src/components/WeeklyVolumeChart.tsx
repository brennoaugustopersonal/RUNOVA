import { memo, useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { getWeeklyVolume } from '../services/statsService';
import { formatDistance, distanceUnitLabel } from '../utils/formatters';
import type { RunRecord, UnitSystem } from '../types/domain';

interface WeeklyVolumeChartProps {
  runs: RunRecord[];
  units?: UnitSystem;
  weeks?: number;
}

/** Volume semanal — a métrica que melhor indica progressão e risco de lesão. */
function WeeklyVolumeChartFn({ runs, units = 'metric', weeks = 8 }: WeeklyVolumeChartProps) {
  const buckets = useMemo(() => getWeeklyVolume(runs, weeks), [runs, weeks]);
  const maxKm = Math.max(...buckets.map((b) => b.distanceKm), 1);
  const unit = distanceUnitLabel(units);

  const lastWeek = buckets[buckets.length - 2]?.distanceKm ?? 0;
  const thisWeek = buckets[buckets.length - 1]?.distanceKm ?? 0;
  const deltaPercent = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;

  return (
    <section className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
          <BarChart2 className="w-5 h-5 text-[#38bdf8]" aria-hidden="true" />
          Volume semanal
        </h3>
        {deltaPercent !== null && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
              deltaPercent > 30
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : deltaPercent >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
            }`}
          >
            {deltaPercent >= 0 ? '+' : ''}
            {deltaPercent}% vs semana anterior
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-1.5 h-28">
        {buckets.map((bucket, i) => {
          const isCurrent = i === buckets.length - 1;
          const heightPercent = bucket.distanceKm > 0 ? (bucket.distanceKm / maxKm) * 100 : 2;
          return (
            <div key={bucket.weekStart} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[9px] font-mono text-slate-500">
                {bucket.distanceKm > 0 ? formatDistance(bucket.distanceKm, 0, units) : ''}
              </span>
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t-lg transition-all duration-700 ${
                    isCurrent
                      ? 'bg-gradient-to-t from-[#ff6d2e] to-[#ffb800]'
                      : 'bg-slate-700/80'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                  title={`${bucket.label}: ${formatDistance(bucket.distanceKm, 1, units)} ${unit} em ${bucket.runs} corrida(s)`}
                />
              </div>
              <span
                className={`text-[9px] font-medium truncate max-w-full ${isCurrent ? 'text-[#ffb800] font-bold' : 'text-slate-500'}`}
              >
                {bucket.label}
              </span>
            </div>
          );
        })}
      </div>

      {deltaPercent !== null && deltaPercent > 30 && (
        <p className="text-[10px] text-amber-300 leading-relaxed">
          Aumento acima de 30 % em uma semana eleva o risco de lesão. A regra prática dos 10 % por
          semana costuma ser mais segura.
        </p>
      )}
    </section>
  );
}

export const WeeklyVolumeChart = memo(WeeklyVolumeChartFn);
