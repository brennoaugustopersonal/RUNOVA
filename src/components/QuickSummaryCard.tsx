import { memo } from 'react';
import { Activity, Flame, Navigation, ArrowUpRight, CalendarRange, Zap } from 'lucide-react';
import {
  formatDistance,
  formatPace,
  formatTime,
  formatDate,
  distanceUnitLabel,
  formatDuration,
} from '../utils/formatters';
import type { RunStats, UnitSystem } from '../types/domain';

interface QuickSummaryCardProps {
  stats: RunStats;
  units?: UnitSystem;
  onOpenSetup: () => void;
}

function QuickSummaryCardFn({ stats, units = 'metric', onOpenSetup }: QuickSummaryCardProps) {
  const {
    totalDistanceKm,
    avgPaceMinKm,
    totalRuns,
    totalDurationSeconds,
    thisWeekKm,
    currentStreakDays,
    lastRun,
  } = stats;
  const unit = distanceUnitLabel(units);

  return (
    <div className="space-y-4">
      <section
        className="relative overflow-hidden rounded-3xl p-6 glass-panel border border-white/10 shadow-card"
        aria-label="Resumo de desempenho"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#ff6d2e]/20 via-[#ffb800]/10 to-transparent blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#ff6d2e]/10 border border-[#ff6d2e]/20 text-[#ff6d2e]">
              <Activity className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Desempenho Geral
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 whitespace-nowrap">
            {totalRuns} {totalRuns === 1 ? 'corrida' : 'corridas'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 my-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Distância Total</p>
            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-white">
                {formatDistance(totalDistanceKm, 1, units)}
              </span>
              <span className="text-sm font-bold text-[#ff6d2e]">{unit}</span>
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Ritmo Médio</p>
            <p className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
                {formatPace(avgPaceMinKm, units)}
              </span>
              <span className="text-xs font-semibold text-slate-400">/{unit}</span>
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
          <div className="text-center">
            <dt className="text-[10px] uppercase font-bold text-slate-500">Últimos 7 dias</dt>
            <dd className="text-sm font-extrabold text-white font-mono mt-0.5">
              {formatDistance(thisWeekKm, 1, units)} {unit}
            </dd>
          </div>
          <div className="text-center border-x border-white/5">
            <dt className="text-[10px] uppercase font-bold text-slate-500">Sequência</dt>
            <dd className="text-sm font-extrabold text-white font-mono mt-0.5 flex items-center justify-center gap-1">
              {currentStreakDays > 0 && (
                <Zap className="w-3 h-3 text-[#ffb800] fill-[#ffb800]" aria-hidden="true" />
              )}
              {currentStreakDays} {currentStreakDays === 1 ? 'dia' : 'dias'}
            </dd>
          </div>
          <div className="text-center">
            <dt className="text-[10px] uppercase font-bold text-slate-500">Tempo total</dt>
            <dd className="text-sm font-extrabold text-white font-mono mt-0.5">
              {formatDuration(totalDurationSeconds)}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onOpenSetup}
          className="w-full mt-5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 font-extrabold text-sm tracking-wide shadow-glow hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <span>CONFIGURAR NOVA CORRIDA</span>
          <ArrowUpRight className="w-4 h-4 stroke-[3]" aria-hidden="true" />
        </button>
      </section>

      {lastRun && (
        <div className="rounded-2xl p-4 glass-panel border border-white/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 shrink-0 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center text-[#ffb800]">
              <Navigation className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-slate-200">Última Sessão</p>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <CalendarRange className="w-3 h-3" aria-hidden="true" />
                  {formatDate(lastRun.date)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {formatDistance(lastRun.distanceKm, 2, units)} {unit} ·{' '}
                {formatTime(lastRun.durationSeconds)} · {formatPace(lastRun.paceMinKm, units)}/
                {unit}
                {lastRun.locationLabel ? ` · ${lastRun.locationLabel}` : ''}
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1 text-[#ffb800] text-xs font-semibold whitespace-nowrap">
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            {lastRun.calories} kcal
          </span>
        </div>
      )}
    </div>
  );
}

export const QuickSummaryCard = memo(QuickSummaryCardFn);
