import { memo, useMemo } from 'react';
import { Medal, Gauge } from 'lucide-react';
import { getPersonalRecords, getBestVo2Max } from '../services/statsService';
import { formatTime, formatPace, formatDate, distanceUnitLabel } from '../utils/formatters';
import type { RunRecord, UnitSystem } from '../types/domain';

interface PersonalRecordsCardProps {
  runs: RunRecord[];
  units?: UnitSystem;
}

function classifyVo2Max(vo2: number): string {
  if (vo2 >= 60) return 'Elite';
  if (vo2 >= 52) return 'Excelente';
  if (vo2 >= 45) return 'Bom';
  if (vo2 >= 38) return 'Médio';
  return 'Iniciante';
}

/** Recordes por distância clássica + VO2máx estimado. */
function PersonalRecordsCardFn({ runs, units = 'metric' }: PersonalRecordsCardProps) {
  const records = useMemo(() => getPersonalRecords(runs), [runs]);
  const vo2 = useMemo(() => getBestVo2Max(runs), [runs]);
  const unit = distanceUnitLabel(units);

  if (records.length === 0 && vo2 === 0) return null;

  return (
    <section className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
        <Medal className="w-5 h-5 text-[#ffb800]" aria-hidden="true" />
        Recordes pessoais
      </h3>

      {vo2 > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#ff6d2e]/10 to-transparent border border-[#ff6d2e]/20">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Gauge className="w-4 h-4 text-[#ff6d2e]" aria-hidden="true" />
            VO₂máx estimado
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{vo2}</span>
            <span className="text-[10px] text-slate-400">ml/kg/min</span>
            <span className="text-[10px] font-bold text-[#ffb800]">{classifyVo2Max(vo2)}</span>
          </span>
        </div>
      )}

      {records.length > 0 && (
        <ul className="space-y-2">
          {records.map((record) => (
            <li
              key={record.label}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5"
            >
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-white">{record.label}</span>
                <span className="block text-[10px] text-slate-500 truncate">
                  {formatDate(record.date)}
                </span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-sm font-black text-white font-mono">
                  {formatTime(record.durationSeconds)}
                </span>
                <span className="block text-[10px] text-[#ffb800] font-mono">
                  {formatPace(record.paceMinKm, units)}/{unit}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-slate-500 leading-relaxed">
        Tempos projetados a partir do melhor ritmo registrado em cada faixa de distância. VO₂máx
        estimado pela fórmula de Daniels &amp; Gilbert — referência de treino, não diagnóstico.
      </p>
    </section>
  );
}

export const PersonalRecordsCard = memo(PersonalRecordsCardFn);
