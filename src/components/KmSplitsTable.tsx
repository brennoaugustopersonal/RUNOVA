import { memo, useMemo } from 'react';
import { Flag } from 'lucide-react';
import { formatPace, formatTime, distanceUnitLabel } from '../utils/formatters';
import type { Split, UnitSystem } from '../types/domain';

interface KmSplitsTableProps {
  splits?: Split[];
  units?: UnitSystem;
}

function KmSplitsTableFn({ splits = [], units = 'metric' }: KmSplitsTableProps) {
  const paceRange = useMemo(() => {
    const paces = splits.map((s) => s.paceMinKm).filter((p) => p > 0);
    if (paces.length === 0) return null;
    const min = Math.min(...paces);
    const max = Math.max(...paces);
    return { min, max, span: Math.max(0.01, max - min) };
  }, [splits]);

  if (splits.length === 0) return null;

  const unit = distanceUnitLabel(units);

  return (
    <section className="p-4 rounded-2xl glass-panel border border-white/10 space-y-3">
      <h4 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-300 border-b border-white/10 pb-2">
        <Flag className="w-4 h-4 text-[#ff6d2e]" aria-hidden="true" />
        Parciais por quilômetro
      </h4>

      <ul className="space-y-2">
        {splits.map((split) => {
          // Barra proporcional: mais rápido = barra mais cheia.
          const fill = paceRange
            ? 30 + ((paceRange.max - split.paceMinKm) / paceRange.span) * 70
            : 60;

          return (
            <li
              key={split.km}
              className={`relative overflow-hidden flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-colors ${
                split.isBest
                  ? 'bg-[#ff6d2e]/10 border-[#ff6d2e]/30 text-white'
                  : 'bg-white/5 border-white/5 text-slate-300'
              }`}
            >
              <span
                className="absolute inset-y-0 left-0 bg-white/[0.04] pointer-events-none"
                style={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
                aria-hidden="true"
              />

              <span className="relative flex items-center gap-2 min-w-0">
                <span className="text-xs font-extrabold text-slate-400 font-mono">
                  {unit === 'mi' ? 'Mi' : 'Km'} {split.km}
                </span>
                {split.isBest && (
                  <span className="px-1.5 py-0.5 rounded bg-[#ff6d2e] text-slate-950 text-[9px] font-black uppercase whitespace-nowrap">
                    Mais rápido
                  </span>
                )}
              </span>

              <span className="relative flex items-center gap-4 text-xs font-mono font-bold shrink-0">
                <span className="text-slate-400">{formatTime(split.durationSeconds)}</span>
                <span className="text-[#ffb800]">
                  {formatPace(split.paceMinKm, units)} /{unit}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export const KmSplitsTable = memo(KmSplitsTableFn);
