import React from 'react';
import { Trophy } from 'lucide-react';
import { getBadges } from '../services/badgeService';

function BadgesGridFn({ runs = [] }) {
  const badges = getBadges(runs);

  return (
    <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#ffb800]" />
          <h3 className="text-sm font-extrabold text-white">Conquistas & Galeria</h3>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
          {badges.filter((b) => b.unlocked).length} / {badges.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {badges.map((badge) => {
          const IconComponent = badge.icon;
          return (
            <div
              key={badge.id}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                badge.unlocked
                  ? 'bg-gradient-to-tr from-[#ff6d2e]/15 to-[#ffb800]/10 border-[#ff6d2e]/30'
                  : 'bg-white/[0.02] border-white/5 opacity-50 grayscale'
              }`}
            >
              <div
                className={`p-2.5 rounded-xl ${
                  badge.unlocked
                    ? 'bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] text-slate-950 shadow-glow'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <IconComponent className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-0.5 min-w-0">
                <h4 className="text-xs font-extrabold text-white leading-tight">
                  {badge.title}
                </h4>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {badge.desc}
                </p>
                {!badge.unlocked && badge.progress != null && (
                  <div className="w-full h-1.5 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] transition-all"
                      style={{ width: `${Math.min(100, Math.round(badge.progress * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const BadgesGrid = React.memo(BadgesGridFn);
