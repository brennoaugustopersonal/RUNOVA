import { memo, useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { getBadges } from '../services/badgeService';
import type { RunRecord } from '../types/domain';

interface BadgesGridProps {
  runs?: RunRecord[];
}

function BadgesGridFn({ runs = [] }: BadgesGridProps) {
  const badges = useMemo(() => getBadges(runs), [runs]);
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <section className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
          <Trophy className="w-5 h-5 text-[#ffb800]" aria-hidden="true" />
          Conquistas
        </h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 whitespace-nowrap">
          {unlockedCount} / {badges.length}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] transition-all duration-700"
          style={{ width: `${(unlockedCount / badges.length) * 100}%` }}
        />
      </div>

      <ul className="grid grid-cols-2 gap-3">
        {badges.map((badge) => {
          const Icon = badge.icon;
          return (
            <li
              key={badge.id}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                badge.unlocked
                  ? 'bg-gradient-to-tr from-[#ff6d2e]/15 to-[#ffb800]/10 border-[#ff6d2e]/30'
                  : 'bg-white/[0.02] border-white/5 opacity-60'
              }`}
              aria-label={`${badge.title}: ${badge.unlocked ? 'desbloqueada' : 'bloqueada'}. ${badge.desc}`}
            >
              <span
                className={`p-2.5 rounded-xl shrink-0 ${
                  badge.unlocked
                    ? 'bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>

              <span className="flex-1 space-y-0.5 min-w-0">
                <span className="block text-xs font-extrabold text-white leading-tight">
                  {badge.title}
                </span>
                <span className="block text-[10px] text-slate-400 leading-tight">{badge.desc}</span>
                {!badge.unlocked && badge.progress != null && badge.progress > 0 && (
                  <span className="block w-full h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] transition-all"
                      style={{ width: `${Math.round(badge.progress * 100)}%` }}
                    />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export const BadgesGrid = memo(BadgesGridFn);
