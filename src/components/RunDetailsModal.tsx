import { memo } from 'react';
import {
  X,
  Navigation,
  Clock,
  Flame,
  Gauge,
  Calendar,
  Mountain,
  MapPin,
  Download,
  Gamepad2,
} from 'lucide-react';
import {
  formatTime,
  formatPace,
  formatDistance,
  formatDate,
  distanceUnitLabel,
  speedUnitLabel,
  formatSpeed,
} from '../utils/formatters';
import { PerformanceChart } from './PerformanceChart';
import { HeartRateChart } from './HeartRateChart';
import { HeartRateZonesCard } from './HeartRateZonesCard';
import { RouteMap } from './RouteMap';
import { KmSplitsTable } from './KmSplitsTable';
import { useModalA11y } from '../hooks/useModalA11y';
import { describeTerrain } from '../services/elevationService';
import { downloadGpx } from '../utils/download';
import type { RunRecord, UnitSystem } from '../types/domain';

interface RunDetailsModalProps {
  run: RunRecord | null;
  allRuns?: RunRecord[];
  units?: UnitSystem;
  maxHrBpm: number;
  onClose: () => void;
}

function RunDetailsModalFn({
  run,
  allRuns = [],
  units = 'metric',
  maxHrBpm,
  onClose,
}: RunDetailsModalProps) {
  const containerRef = useModalA11y(run !== null, onClose);

  if (!run) return null;

  const { routePoints = [], splits = [], heartRateHistory = [] } = run;
  const unit = distanceUnitLabel(units);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-details-title"
        tabIndex={-1}
        className="relative w-full max-w-md my-auto bg-[#0d0d14] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-modal-enter"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-2 rounded-xl bg-[#ff6d2e]/10 text-[#ff6d2e] border border-[#ff6d2e]/20 shrink-0">
              <Calendar className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="run-details-title" className="text-base font-extrabold text-white">
                Detalhes da sessão
              </h2>
              <p className="text-xs text-slate-400 truncate">{formatDate(run.date)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            aria-label="Fechar detalhes"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
            {run.mode === 'gps' ? (
              <Navigation className="w-3 h-3 text-[#ff6d2e]" aria-hidden="true" />
            ) : (
              <Gamepad2 className="w-3 h-3 text-amber-400" aria-hidden="true" />
            )}
            {run.mode === 'gps' ? 'GPS real' : 'Simulação'}
          </span>
          {run.completedGoal && (
            <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
              Meta alcançada
            </span>
          )}
          {run.locationLabel && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
              <MapPin className="w-3 h-3" aria-hidden="true" />
              {run.locationLabel}
            </span>
          )}
        </div>

        {routePoints.length > 0 && <RouteMap routePoints={routePoints} height="180px" />}

        <dl className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Navigation className="w-3.5 h-3.5 text-[#ff6d2e]" aria-hidden="true" />
              Distância
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {formatDistance(run.distanceKm, 2, units)}{' '}
              <span className="text-xs text-[#ff6d2e]">{unit}</span>
            </dd>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#ffb800]" aria-hidden="true" />
              Tempo
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {formatTime(run.durationSeconds)}
              {run.movingSeconds != null && run.durationSeconds - run.movingSeconds > 30 && (
                <span className="block text-[10px] font-medium text-slate-500 font-sans">
                  {formatTime(run.movingSeconds)} em movimento
                </span>
              )}
            </dd>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Gauge className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
              Ritmo médio
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {formatPace(run.paceMinKm, units)}{' '}
              <span className="text-xs text-slate-400">/{unit}</span>
            </dd>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Flame className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
              Calorias
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {run.calories} <span className="text-xs text-slate-400">kcal</span>
            </dd>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="text-xs text-slate-400 font-medium">Velocidade média</dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {formatSpeed(run.speedKmh, units)}{' '}
              <span className="text-xs text-slate-400">{speedUnitLabel(units)}</span>
            </dd>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Mountain className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              Elevação
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              +{run.elevationGainM ?? 0} <span className="text-xs text-slate-400">m</span>
            </dd>
            <dd className="text-[9px] text-slate-500">
              {describeTerrain(run.distanceKm, run.elevationGainM)}
            </dd>
          </div>
        </dl>

        {routePoints.length >= 2 && (
          <button
            type="button"
            onClick={() =>
              downloadGpx(
                routePoints,
                `RUNOVA ${formatDistance(run.distanceKm, 2)} km`,
                run.date,
                `runova-${run.id}.gpx`
              )
            }
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-[#ffb800] transition-colors"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Exportar rota em GPX
          </button>
        )}

        {splits.length > 0 && <KmSplitsTable splits={splits} units={units} />}

        {heartRateHistory.length > 0 && (
          <>
            <HeartRateChart
              heartRateHistory={heartRateHistory}
              durationSeconds={run.durationSeconds}
            />
            <HeartRateZonesCard heartRateHistory={heartRateHistory} maxHrBpm={maxHrBpm} />
          </>
        )}

        <PerformanceChart
          currentRun={run}
          historyRuns={allRuns.filter((r) => r.id !== run.id)}
          units={units}
        />

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-colors"
        >
          FECHAR
        </button>
      </div>
    </div>
  );
}

export const RunDetailsModal = memo(RunDetailsModalFn);
