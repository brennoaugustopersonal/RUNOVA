import React from 'react';
import { Flag, Zap } from 'lucide-react';
import { formatPace, formatTime } from '../utils/formatters';

export function KmSplitsTable({ splits = [] }) {
  if (!splits || splits.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl glass-panel border border-white/10 space-y-3">
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Flag className="w-4 h-4 text-[#ff6d2e]" />
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Parciais por Quilômetro (Splits)
        </h4>
      </div>

      <div className="space-y-2">
        {splits.map((split, index) => {
          const isBest = split.isBest;
          return (
            <div
              key={index}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                isBest
                  ? 'bg-[#ff6d2e]/10 border-[#ff6d2e]/30 text-white'
                  : 'bg-white/5 border-white/5 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-400 font-mono">
                  Km {split.km}
                </span>
                {isBest && (
                  <span className="px-1.5 py-0.5 rounded bg-[#ff6d2e] text-slate-950 text-[9px] font-black uppercase">
                    Mais Rápido ⚡
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs font-mono font-bold">
                <span className="text-slate-400">{formatTime(split.durationSeconds)}</span>
                <span className="text-[#ffb800]">{formatPace(split.paceMinKm)} /km</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
