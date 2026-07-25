import { memo, useCallback, useState } from 'react';
import {
  Pause,
  Play,
  Square,
  FastForward,
  Heart,
  Volume2,
  VolumeX,
  MapPin,
  Activity,
  Bluetooth,
  BluetoothConnected,
  Mountain,
} from 'lucide-react';
import {
  formatTime,
  formatPace,
  formatDistance,
  formatSpeed,
  distanceUnitLabel,
  speedUnitLabel,
} from '../utils/formatters';
import { voiceService } from '../services/voiceService';
import { RouteMap } from './RouteMap';
import { ConfirmDialog } from './ConfirmDialog';
import { getMetricConfidence } from '../services/physioEstimation';
import type { RunState, UnitSystem } from '../types/domain';

const MIN_PACE = 2.0;
const MAX_PACE = 10.0;

interface ActiveRunViewProps {
  runState: RunState | null;
  units?: UnitSystem;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onToggleSpeed: () => void;
  onConnectBluetoothHr?: () => Promise<void> | void;
  onDisconnectBluetoothHr?: () => Promise<void> | void;
  bluetoothConnected?: boolean;
}

interface MetricCardProps {
  label: string;
  value: string;
  suffix: string;
  confidence: string;
  suffixClass?: string;
}

function MetricCard({ label, value, suffix, confidence, suffixClass }: MetricCardProps) {
  return (
    <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-0.5">
      <p className="flex items-center gap-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            confidence === 'measured' || confidence === 'calculated'
              ? 'bg-emerald-500'
              : 'bg-amber-500'
          }`}
          aria-hidden="true"
        />
        <span className="text-[10px] font-bold text-slate-400 uppercase">{label}</span>
      </p>
      <p className="text-xl font-black text-white font-mono">
        {value}
        <span className={`text-xs ml-1 ${suffixClass ?? 'font-normal text-slate-400'}`}>
          {suffix}
        </span>
      </p>
    </div>
  );
}

function ActiveRunViewFn({
  runState,
  units = 'metric',
  onPause,
  onResume,
  onFinish,
  onToggleSpeed,
  onConnectBluetoothHr,
  onDisconnectBluetoothHr,
  bluetoothConnected = false,
}: ActiveRunViewProps) {
  const [isMuted, setIsMuted] = useState(voiceService.muted);
  const [viewMode, setViewMode] = useState<'ring' | 'map'>('ring');
  const [btConnecting, setBtConnecting] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const toggleVoiceMute = useCallback(() => {
    setIsMuted(voiceService.toggleMute());
  }, []);

  const handleBluetoothClick = useCallback(async () => {
    if (bluetoothConnected) {
      await onDisconnectBluetoothHr?.();
      return;
    }
    setBtConnecting(true);
    try {
      await onConnectBluetoothHr?.();
    } finally {
      setBtConnecting(false);
    }
  }, [bluetoothConnected, onConnectBluetoothHr, onDisconnectBluetoothHr]);

  if (!runState) return null;

  const {
    elapsedSeconds,
    currentDistanceKm,
    targetDistanceKm,
    currentPaceMinKm,
    targetPaceMinKm,
    speedKmh,
    calories,
    progressPercent,
    status,
    speedMultiplier,
    heartRateBpm,
    cadenceSpm,
    routePoints,
    lastPosition,
    mode,
    gpsAccuracy,
    gpsDegraded,
    elevationGainM,
    splits,
  } = runState;

  const isPaused = status === 'paused';
  const unit = distanceUnitLabel(units);

  const strokeWidth = 12;
  const outerRadius = 110;
  const innerRadius = 90;
  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;
  const outerDashoffset = outerCircumference - (progressPercent / 100) * outerCircumference;

  const pacePercent = Math.min(
    100,
    Math.max(0, ((MAX_PACE - currentPaceMinKm) / (MAX_PACE - MIN_PACE)) * 100)
  );
  const innerDashoffset = innerCircumference - (pacePercent / 100) * innerCircumference;

  const paceDeltaSeconds =
    targetPaceMinKm > 0 && currentPaceMinKm > 0
      ? Math.round((currentPaceMinKm - targetPaceMinKm) * 60)
      : 0;
  const remainingKm = Math.max(0, targetDistanceKm - currentDistanceKm);

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] flex flex-col overflow-y-auto select-none animate-fadeIn">
      <div className="flex flex-col justify-between flex-1 gap-3 p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] max-w-[90vw] bg-gradient-to-tr from-[#ff6d2e]/20 via-[#ffb800]/15 to-transparent rounded-full blur-[95px] pointer-events-none"
          aria-hidden="true"
        />

        {/* Barra superior de status e controles */}
        <div className="relative z-10 flex items-center justify-between gap-2 flex-wrap">
          <p
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs font-semibold border ${
              isPaused || gpsDegraded
                ? 'text-amber-400 border-amber-500/30'
                : 'text-[#ff6d2e] border-[#ff6d2e]/20'
            }`}
            role="status"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPaused
                  ? 'bg-amber-400'
                  : gpsDegraded
                    ? 'bg-amber-400 animate-pulse-soft'
                    : 'bg-[#ff6d2e] animate-ping'
              }`}
              aria-hidden="true"
            />
            <span>
              {isPaused
                ? 'EM PAUSA'
                : mode === 'gps'
                  ? gpsDegraded
                    ? 'GPS FRACO'
                    : 'GPS AO VIVO'
                  : 'SIMULADOR'}
            </span>
            {mode === 'gps' && gpsAccuracy != null && (
              <span className="text-[10px] text-slate-400 font-mono">±{gpsAccuracy} m</span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceMute}
              className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
              aria-label={isMuted ? 'Ativar coach de voz' : 'Silenciar coach de voz'}
              aria-pressed={isMuted}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" aria-hidden="true" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#ffb800]" aria-hidden="true" />
              )}
            </button>

            {typeof navigator !== 'undefined' && 'bluetooth' in navigator && (
              <button
                type="button"
                onClick={() => void handleBluetoothClick()}
                disabled={btConnecting}
                className={`p-2.5 rounded-full border transition-all disabled:opacity-60 ${
                  bluetoothConnected
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-glow'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
                aria-label={
                  bluetoothConnected
                    ? 'Desconectar monitor cardíaco'
                    : 'Conectar monitor cardíaco Bluetooth'
                }
              >
                {btConnecting ? (
                  <Activity className="w-4 h-4 animate-pulse" aria-hidden="true" />
                ) : bluetoothConnected ? (
                  <BluetoothConnected className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Bluetooth className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            )}

            {mode === 'simulation' && (
              <button
                type="button"
                onClick={onToggleSpeed}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-slate-300 transition-colors"
                aria-label={`Velocidade da simulação: ${speedMultiplier} vezes. Tocar para alterar`}
              >
                <FastForward className="w-3.5 h-3.5 text-[#ffb800]" aria-hidden="true" />
                {speedMultiplier}x
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'ring' ? 'map' : 'ring')}
              className={`p-2.5 rounded-full border transition-all ${
                viewMode === 'map'
                  ? 'bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] text-slate-950 border-transparent shadow-glow'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
              aria-label={viewMode === 'map' ? 'Mostrar anel de progresso' : 'Mostrar mapa'}
              aria-pressed={viewMode === 'map'}
            >
              <MapPin className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Anel duplo ou mapa */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
          {viewMode === 'map' ? (
            <div className="w-full max-w-sm space-y-2">
              <RouteMap
                routePoints={routePoints}
                currentPos={lastPosition}
                height="260px"
                live={mode === 'gps'}
              />
              <p className="text-center text-[11px] text-slate-400 font-medium">
                {routePoints.length} pontos gravados · faltam{' '}
                {formatDistance(remainingKm, 2, units)} {unit}
              </p>
            </div>
          ) : (
            <div className="relative w-[min(74vw,270px)] aspect-square flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260" aria-hidden="true">
                <defs>
                  <linearGradient id="ringDistGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff6d2e" />
                    <stop offset="100%" stopColor="#ffb800" />
                  </linearGradient>
                  <linearGradient id="ringPaceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                </defs>

                <circle
                  cx="130"
                  cy="130"
                  r={outerRadius}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                />
                <circle
                  cx="130"
                  cy="130"
                  r={outerRadius}
                  stroke="url(#ringDistGrad)"
                  strokeWidth={strokeWidth}
                  strokeDasharray={outerCircumference}
                  strokeDashoffset={outerDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className={`transition-all duration-500 ease-out ${isPaused ? '' : 'animate-ring-glow'}`}
                />

                <circle
                  cx="130"
                  cy="130"
                  r={innerRadius}
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth={6}
                  fill="transparent"
                />
                <circle
                  cx="130"
                  cy="130"
                  r={innerRadius}
                  stroke="url(#ringPaceGrad)"
                  strokeWidth={6}
                  strokeDasharray={innerCircumference}
                  strokeDashoffset={innerDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 opacity-80"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-1 px-8">
                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                  Tempo decorrido
                </span>
                <output
                  className="text-4xl font-black text-white font-mono tracking-tight"
                  aria-live="off"
                >
                  {formatTime(elapsedSeconds)}
                </output>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-[#ff6d2e]">
                  {progressPercent.toFixed(0)}% concluído
                </span>
                {paceDeltaSeconds !== 0 && (
                  <span
                    className={`text-[10px] font-bold font-mono ${
                      paceDeltaSeconds < 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {paceDeltaSeconds < 0 ? '▲' : '▼'} {Math.abs(paceDeltaSeconds)}s/{unit} vs alvo
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Telemetria fisiológica */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
                <Heart className="w-4 h-4 animate-pulse" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Batimentos</p>
                <p className="text-lg font-black text-white font-mono">
                  {heartRateBpm}
                  <span className="text-xs text-rose-400 font-normal ml-1">bpm</span>
                </p>
              </div>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                bluetoothConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}
            >
              {bluetoothConnected ? 'real' : 'est'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl glass-panel border border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                <Activity className="w-4 h-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Cadência</p>
                <p className="text-lg font-black text-white font-mono">
                  {cadenceSpm}
                  <span className="text-xs text-amber-400 font-normal ml-1">spm</span>
                </p>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
              est
            </span>
          </div>
        </div>

        {/* Métricas principais e ações */}
        <div className="relative z-10 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Ritmo atual"
              value={formatPace(currentPaceMinKm, units)}
              suffix={`/${unit}`}
              confidence={getMetricConfidence('currentPace', mode)}
            />
            <MetricCard
              label="Distância"
              value={formatDistance(currentDistanceKm, 2, units)}
              suffix={`/ ${formatDistance(targetDistanceKm, 1, units)} ${unit}`}
              suffixClass="font-bold text-[#ff6d2e]"
              confidence={getMetricConfidence('distance', mode)}
            />
            <MetricCard
              label="Velocidade"
              value={formatSpeed(speedKmh, units)}
              suffix={speedUnitLabel(units)}
              confidence={getMetricConfidence('speed', mode)}
            />
            <MetricCard
              label="Calorias"
              value={String(calories)}
              suffix="kcal"
              confidence={getMetricConfidence('calories', mode)}
            />
          </div>

          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              medido
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
              estimado
            </span>
            {splits.length > 0 && <span>· {splits.length} km marcados</span>}
            {elevationGainM > 0 && (
              <span className="flex items-center gap-1">
                <Mountain className="w-3 h-3" aria-hidden="true" />+{elevationGainM} m
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={isPaused ? onResume : onPause}
              className={`flex-1 py-4 rounded-2xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 ${
                isPaused
                  ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                  : 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
              }`}
            >
              {isPaused ? (
                <>
                  <Play className="w-5 h-5 fill-slate-950" aria-hidden="true" />
                  CONTINUAR
                </>
              ) : (
                <>
                  <Pause className="w-5 h-5 fill-white" aria-hidden="true" />
                  PAUSAR
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setConfirmFinish(true)}
              className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 flex items-center justify-center active:scale-95 transition-all"
              aria-label="Concluir e salvar corrida"
            >
              <Square className="w-5 h-5 fill-red-400" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmFinish}
        title="Finalizar corrida?"
        message={`Você percorreu ${formatDistance(currentDistanceKm, 2, units)} ${unit} em ${formatTime(elapsedSeconds)}. A sessão será salva no histórico.`}
        confirmLabel="Finalizar"
        cancelLabel="Continuar correndo"
        onConfirm={() => {
          setConfirmFinish(false);
          onFinish();
        }}
        onCancel={() => setConfirmFinish(false)}
      />
    </div>
  );
}

export const ActiveRunView = memo(ActiveRunViewFn);
