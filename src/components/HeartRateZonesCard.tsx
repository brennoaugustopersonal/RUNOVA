import { memo, useMemo } from 'react';
import { Flame } from 'lucide-react';
import { calculateHeartRateZones } from '../utils/calculations';
import { formatDuration } from '../utils/formatters';
import type { HeartRateSample } from '../types/domain';

interface HeartRateZonesCardProps {
  heartRateHistory?: HeartRateSample[];
  maxHrBpm: number;
}

/**
 * Tempo em cada zona de treino — a leitura mais útil de uma sessão:
 * mostra se o treino foi de base, limiar ou intervalado.
 */
function HeartRateZonesCardFn({ heartRateHistory = [], maxHrBpm }: HeartRateZonesCardProps) {
  const zones = useMemo(
    () => calculateHeartRateZones(heartRateHistory, maxHrBpm),
    [heartRateHistory, maxHrBpm]
  );

  if (heartRateHistory.length === 0) return null;

  const dominant = zones.reduce((a, b) => (a.seconds >= b.seconds ? a : b));

  return (
    <section className="p-5 rounded-3xl glass-panel border border-white/10 space-y-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
          <Flame className="w-5 h-5 text-[#ff6d2e]" aria-hidden="true" />
          Zonas de treino
        </h3>
        <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
          FC máx {maxHrBpm} bpm
        </span>
      </div>

      <ul className="space-y-2">
        {zones.map((zone) => (
          <li key={zone.index} className="flex items-center gap-2.5">
            <span className="w-[104px] shrink-0 text-[11px] font-bold text-slate-300">
              {zone.name}
            </span>
            <span className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
              <span
                className="block h-full rounded-full transition-all duration-500"
                style={{ width: `${zone.percent}%`, backgroundColor: zone.color }}
              />
            </span>
            <span className="w-[70px] shrink-0 text-right text-[11px] font-mono text-slate-400">
              {zone.percent}% · {formatDuration(zone.seconds)}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Predominância em <strong className="text-slate-300">{dominant.name}</strong> (
        {dominant.minBpm}–{dominant.maxBpm} bpm). Zonas calculadas sobre a FC máxima do seu perfil —
        estimativa, não substitui avaliação médica.
      </p>
    </section>
  );
}

export const HeartRateZonesCard = memo(HeartRateZonesCardFn);
