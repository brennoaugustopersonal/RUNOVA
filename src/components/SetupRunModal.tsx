import { memo, useCallback, useEffect, useState } from 'react';
import {
  X,
  Target,
  Clock,
  Zap,
  Play,
  Sparkles,
  Navigation,
  Gamepad2,
  CloudSun,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { formatPace, distanceUnitLabel } from '../utils/formatters';
import { useModalA11y } from '../hooks/useModalA11y';
import { fetchWeatherForecast } from '../services/weatherService';
import type { ForecastDay, RunMode, UnitSystem } from '../types/domain';

const SAO_PAULO: [number, number] = [-23.55, -46.63];
const QUICK_DISTANCES = [1, 2.1, 3, 5, 10, 21.1];
const DAY_LABELS = ['Hoje', 'Amanhã', 'Depois'];

interface SetupRunModalProps {
  isOpen: boolean;
  units?: UnitSystem;
  onClose: () => void;
  onStartRun: (targetDistanceKm: number, targetDurationMinutes: number, mode: RunMode) => void;
}

function SetupRunModalFn({ isOpen, units = 'metric', onClose, onStartRun }: SetupRunModalProps) {
  const [distanceKm, setDistanceKm] = useState(2.1);
  const [durationMinutes, setDurationMinutes] = useState(12);
  const [mode, setMode] = useState<RunMode>('simulation');
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
  const [gpsHint, setGpsHint] = useState(false);

  const containerRef = useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;

    const loadForecast = async (lat: number, lon: number) => {
      const days = await fetchWeatherForecast(lat, lon);
      if (!cancelled && days) setForecast(days);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => void loadForecast(pos.coords.latitude, pos.coords.longitude),
        () => void loadForecast(...SAO_PAULO),
        { timeout: 6000, maximumAge: 600000 }
      );
    } else {
      void loadForecast(...SAO_PAULO);
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleModeChange = useCallback((next: RunMode) => {
    setMode(next);
    if (next === 'gps') setGpsHint(true);
  }, []);

  const handleStart = useCallback(() => {
    onStartRun(distanceKm, durationMinutes, mode);
    onClose();
  }, [distanceKm, durationMinutes, mode, onClose, onStartRun]);

  if (!isOpen) return null;

  const expectedPaceMinKm = durationMinutes > 0 && distanceKm > 0 ? durationMinutes / distanceKm : 0;
  // Abaixo de 2:30/km nem recordistas mundiais sustentam — provável meta irreal.
  const paceTooFast = expectedPaceMinKm > 0 && expectedPaceMinKm < 2.5;
  const paceVerySlow = expectedPaceMinKm > 12;
  const unit = distanceUnitLabel(units);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-run-title"
        tabIndex={-1}
        className="relative w-full max-w-md bg-[#0d0d14] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl space-y-5 overflow-y-auto max-h-[92vh] animate-modal-enter"
      >
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] rounded-full sm:hidden"
          aria-hidden="true"
        />

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-[#ff6d2e]/20 to-[#ffb800]/20 text-[#ff6d2e]">
              <Target className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="setup-run-title" className="text-lg font-extrabold text-white">
                Configurar Meta
              </h2>
              <p className="text-xs text-slate-400">Defina a distância e o tempo alvo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div
          className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-white/5"
          role="radiogroup"
          aria-label="Modo de corrida"
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'simulation'}
            onClick={() => handleModeChange('simulation')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              mode === 'simulation'
                ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-4 h-4" aria-hidden="true" />
            Simulador
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={mode === 'gps'}
            onClick={() => handleModeChange('gps')}
            className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
              mode === 'gps'
                ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Navigation className="w-4 h-4" aria-hidden="true" />
            GPS Real
          </button>
        </div>

        {mode === 'simulation' && (
          <p className="text-[11px] text-slate-500 leading-relaxed px-1">
            O simulador gera telemetria e uma rota fictícia para treino indoor. Não usa GPS real e
            os dados são marcados como simulados no histórico.
          </p>
        )}

        {mode === 'gps' && gpsHint && (
          <p className="flex gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200 leading-relaxed">
            <Shield className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" aria-hidden="true" />
            <span>
              O GPS é lido apenas no seu aparelho — nada é enviado a servidores. Permita o acesso
              à localização e mantenha a tela ligada para melhor precisão.
            </span>
          </p>
        )}

        {forecast && forecast.length > 0 && (
          <section className="space-y-2" aria-label="Previsão do tempo">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <CloudSun className="w-3.5 h-3.5 text-[#ffb800]" aria-hidden="true" />
              Condições para correr
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {forecast.map((day, i) => (
                <div
                  key={day.date}
                  className="p-2.5 rounded-xl glass-panel border border-white/5 text-center space-y-1"
                >
                  <p className="text-[10px] font-bold text-slate-400">{DAY_LABELS[i] ?? day.date}</p>
                  <p className="text-lg leading-none" aria-hidden="true">
                    {day.emoji}
                  </p>
                  <p className="text-[11px] font-bold text-white">
                    {day.tempMin}°–{day.tempMax}°
                  </p>
                  <p className="text-[9px] text-slate-500 truncate">
                    {day.precipitation > 0 ? `${day.precipitation} mm` : 'seco'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Distâncias populares
          </legend>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_DISTANCES.map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => setDistanceKm(dist)}
                aria-pressed={distanceKm === dist}
                className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  distanceKm === dist
                    ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                    : 'bg-white/5 text-slate-300 border border-white/5 hover:bg-white/10'
                }`}
              >
                {dist} km
              </button>
            ))}
          </div>
        </fieldset>

        <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="setup-distance"
              className="flex items-center gap-2 text-slate-300 text-sm font-semibold"
            >
              <Zap className="w-4 h-4 text-[#ff6d2e]" aria-hidden="true" />
              Distância alvo
            </label>
            <span className="flex items-baseline gap-1">
              <output className="text-2xl font-extrabold text-white font-mono">
                {distanceKm.toFixed(1)}
              </output>
              <span className="text-xs font-bold text-[#ff6d2e]">km</span>
            </span>
          </div>

          <input
            id="setup-distance"
            type="range"
            min="0.5"
            max="42.2"
            step="0.1"
            value={distanceKm}
            onChange={(e) => setDistanceKm(parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#ff6d2e]"
          />
        </div>

        <div className="p-4 rounded-2xl glass-panel border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="setup-duration"
              className="flex items-center gap-2 text-slate-300 text-sm font-semibold"
            >
              <Clock className="w-4 h-4 text-[#ffb800]" aria-hidden="true" />
              Tempo alvo
            </label>
            <span className="flex items-baseline gap-1">
              <output className="text-2xl font-extrabold text-white font-mono">
                {durationMinutes}
              </output>
              <span className="text-xs font-bold text-[#ffb800]">minutos</span>
            </span>
          </div>

          <input
            id="setup-duration"
            type="range"
            min="3"
            max="300"
            step="1"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#ffb800]"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-[#ff6d2e]/10 border border-[#ff6d2e]/20 flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-2 text-[#ff6d2e] font-semibold">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Ritmo alvo necessário
          </span>
          <span className="text-sm font-extrabold text-white font-mono whitespace-nowrap">
            {formatPace(expectedPaceMinKm, units)} /{unit}
          </span>
        </div>

        {(paceTooFast || paceVerySlow) && (
          <p className="flex gap-2 items-start text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>
              {paceTooFast
                ? 'Esse ritmo é mais rápido que o recorde mundial. Aumente o tempo alvo para uma meta alcançável.'
                : 'Ritmo muito lento para corrida — pode ser adequado para caminhada.'}
            </span>
          </p>
        )}

        <p className="text-[10px] text-slate-500 px-1">
          A sessão encerra ao atingir a distância. O tempo define o ritmo-alvo usado pelo coach de
          voz durante a corrida.
        </p>

        <button
          type="button"
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 font-black text-base tracking-wider shadow-glow hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 touch-manipulation"
        >
          <Play className="w-5 h-5 fill-slate-950" aria-hidden="true" />
          INICIAR CORRIDA
        </button>
      </div>
    </div>
  );
}

export const SetupRunModal = memo(SetupRunModalFn);
