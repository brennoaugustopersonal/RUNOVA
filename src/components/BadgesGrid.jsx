import React from 'react';
import { Trophy, Award, Zap, Flame, Crown, ShieldCheck } from 'lucide-react';

export function BadgesGrid({ runs = [] }) {
  const totalRuns = runs.length;
  const totalKm = runs.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
  const bestPace = runs.length > 0 ? Math.min(...runs.map((r) => r.paceMinKm || 99)) : 99;

  const badges = [
    {
      id: 'first_run',
      title: 'Primeira Passada',
      desc: 'Conclua a 1ª corrida',
      icon: Award,
      unlocked: totalRuns >= 1,
    },
    {
      id: 'speed_demon',
      title: 'Velocista',
      desc: 'Pace abaixo de 5:30/km',
      icon: Zap,
      unlocked: bestPace < 5.5,
    },
    {
      id: 'endurance_5k',
      title: 'Resistência 5K',
      desc: 'Corra 5 km em 1 sessão',
      icon: Flame,
      unlocked: runs.some((r) => r.distanceKm >= 5),
    },
    {
      id: 'runner_pro',
      title: 'Mestre da Pista',
      desc: 'Acumule 10 km no total',
      icon: Crown,
      unlocked: totalKm >= 10,
    },
  ];

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

              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-white leading-tight">
                  {badge.title}
                </h4>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {badge.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
