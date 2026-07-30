import { memo, useEffect, useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  Flame,
  Navigation,
  Clock,
  ArrowRight,
  Mountain,
  Share2,
  Download,
} from 'lucide-react';
import {
  formatTime,
  formatPace,
  formatDistance,
  distanceUnitLabel,
} from '../utils/formatters';
import { PerformanceChart } from './PerformanceChart';
import { HeartRateChart } from './HeartRateChart';
import { HeartRateZonesCard } from './HeartRateZonesCard';
import { RouteMap } from './RouteMap';
import { KmSplitsTable } from './KmSplitsTable';
import { useModalA11y } from '../hooks/useModalA11y';
import { fetchElevationGain, describeTerrain } from '../services/elevationService';
import { downloadGpx } from '../utils/download';
import type { RunRecord, UnitSystem } from '../types/domain';

/** Abaixo disto a corrida é curta demais para relevo ou comparação de ritmo. */
const MIN_DISTANCE_FOR_ELEVATION_KM = 0.5;
const MIN_DISTANCE_FOR_PACE_COMPARISON_KM = 0.2;

interface SessionSummaryModalProps {
  runData: RunRecord | null;
  historyRuns?: RunRecord[];
  units?: UnitSystem;
  maxHrBpm: number;
  onClose: () => void;
}

function SessionSummaryModalFn({
  runData,
  historyRuns = [],
  units = 'metric',
  maxHrBpm,
  onClose,
}: SessionSummaryModalProps) {
  const [elevationGain, setElevationGain] = useState(runData?.elevationGainM ?? 0);
  const [shareState, setShareState] = useState<'idle' | 'copied'>('idle');
  const containerRef = useModalA11y(runData !== null, onClose);

  useEffect(() => {
    if (!runData) return undefined;
    if (runData.elevationGainM > 0) {
      setElevationGain(runData.elevationGainM);
      return undefined;
    }
    // Rotas curtas não têm relevo mensurável — só ruído do modelo de elevação.
    if (
      runData.mode !== 'gps' ||
      (runData.routePoints?.length ?? 0) < 2 ||
      runData.distanceKm < MIN_DISTANCE_FOR_ELEVATION_KM
    ) {
      return undefined;
    }

    let cancelled = false;
    void fetchElevationGain(runData.routePoints).then((gain) => {
      if (!cancelled && gain > 0) setElevationGain(gain);
    });
    return () => {
      cancelled = true;
    };
  }, [runData]);

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
    targetPaceMinKm,
  } = runData;

  const unit = distanceUnitLabel(units);
  const movingSeconds = runData.movingSeconds ?? durationSeconds;
  const stoppedSeconds = Math.max(0, durationSeconds - movingSeconds);

  // Comparação só faz sentido com distância real percorrida; e o desvio é
  // limitado a ±99,9 % para nunca exibir algo como "−1077,7 %".
  const paceVsTarget =
    targetPaceMinKm > 0 && paceMinKm > 0 && distanceKm >= MIN_DISTANCE_FOR_PACE_COMPARISON_KM
      ? Math.max(-99.9, Math.min(99.9, ((targetPaceMinKm - paceMinKm) / targetPaceMinKm) * 100))
      : null;
  const showElevation = elevationGain > 0 && distanceKm >= MIN_DISTANCE_FOR_ELEVATION_KM;

  const shareText =
    `Corri ${formatDistance(distanceKm, 2, units)} ${unit} em ${formatTime(durationSeconds)} ` +
    `(${formatPace(paceMinKm, units)}/${unit}) — RUNOVA`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'RUNOVA', text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2000);
    } catch {
      // usuário cancelou o compartilhamento — sem ação
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fadeIn"
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-title"
        tabIndex={-1}
        className="relative w-full max-w-md my-auto bg-[#0c0c12] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-modal-enter"
      >
        <div
          className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-[#ff6d2e]/30 via-[#ffb800]/20 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="text-center space-y-2 pt-2 relative">
          <span className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-1 shadow-glow flex items-center justify-center">
            <span className="w-full h-full bg-[#0a0a0f] rounded-[22px] flex items-center justify-center">
              <Trophy className="w-8 h-8 text-[#ffb800] animate-bounce-soft" aria-hidden="true" />
            </span>
          </span>

          <h2 id="summary-title" className="text-2xl font-black text-white tracking-tight">
            {completedGoal ? 'Objetivo concluído!' : 'Sessão finalizada!'}
          </h2>
          <p className="text-xs text-slate-400">
            Métricas salvas neste dispositivo. Bom trabalho!
          </p>
        </div>

        {routePoints.length > 0 && <RouteMap routePoints={routePoints} height="180px" />}

        <dl className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Navigation className="w-3.5 h-3.5 text-[#ff6d2e]" aria-hidden="true" />
              Distância
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {formatDistance(distanceKm, 2, units)}{' '}
              <span className="text-xs text-[#ff6d2e]">{unit}</span>
            </dd>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-[#ffb800]" aria-hidden="true" />
              Tempo
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {formatTime(durationSeconds)}
              {stoppedSeconds > 30 && (
                <span className="block text-[10px] font-medium text-slate-500 font-sans">
                  {formatTime(movingSeconds)} em movimento
                </span>
              )}
            </dd>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              Ritmo médio
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {formatPace(paceMinKm, units)}{' '}
              <span className="text-xs text-slate-400">/{unit}</span>
            </dd>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-1">
            <dt className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Flame className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
              Calorias
            </dt>
            <dd className="text-xl font-extrabold text-white font-mono">
              {calories} <span className="text-xs text-slate-400">kcal</span>
            </dd>
          </div>
        </dl>

        {(showElevation || paceVsTarget != null) && (
          <div className="grid grid-cols-2 gap-3">
            {showElevation && (
              <div className="p-3 rounded-2xl glass-panel border border-white/5 flex items-center gap-2">
                <Mountain className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Elevação</p>
                  <p className="text-sm font-extrabold text-white font-mono">+{elevationGain} m</p>
                  <p className="text-[9px] text-slate-500 truncate">
                    {describeTerrain(distanceKm, elevationGain)}
                  </p>
                </div>
              </div>
            )}
            {paceVsTarget != null && (
              <div className="p-3 rounded-2xl glass-panel border border-white/5">
                <p className="text-[10px] text-slate-400 font-bold uppercase">vs ritmo alvo</p>
                <p
                  className={`text-sm font-extrabold font-mono ${
                    paceVsTarget >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {paceVsTarget >= 0 ? '+' : ''}
                  {paceVsTarget.toFixed(1)}%
                </p>
                <p className="text-[9px] text-slate-500">
                  {paceVsTarget >= 0 ? 'acima do esperado' : 'abaixo do esperado'}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <Share2 className="w-4 h-4" aria-hidden="true" />
            {shareState === 'copied' ? 'Copiado!' : 'Compartilhar'}
          </button>
          <button
            type="button"
            disabled={routePoints.length < 2}
            onClick={() =>
              downloadGpx(
                routePoints,
                `RUNOVA ${formatDistance(distanceKm, 2)} km`,
                runData.date,
                `runova-${runData.id}.gpx`
              )
            }
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-[#ffb800] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              routePoints.length < 2 ? 'Sem rota gravada' : 'Exportar GPX (Strava, Garmin, Komoot)'
            }
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            GPX
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Calorias e FC são estimativas baseadas no seu perfil. Elevação via Open-Meteo (gratuito).
        </p>

        {splits.length > 0 && <KmSplitsTable splits={splits} units={units} />}

        {heartRateHistory.length > 0 && (
          <>
            <HeartRateChart
              heartRateHistory={heartRateHistory}
              durationSeconds={durationSeconds}
            />
            <HeartRateZonesCard heartRateHistory={heartRateHistory} maxHrBpm={maxHrBpm} />
          </>
        )}

        <PerformanceChart currentRun={runData} historyRuns={historyRuns} units={units} />

        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 font-black text-sm tracking-wider shadow-glow hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          VOLTAR AO INÍCIO
          <ArrowRight className="w-4 h-4 stroke-[3]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export const SessionSummaryModal = memo(SessionSummaryModalFn);
