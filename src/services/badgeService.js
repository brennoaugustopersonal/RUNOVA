import { Award, Zap, Flame, Crown, Activity, TrendingUp, Map, Target, Trophy, Gauge, Navigation } from 'lucide-react';

export function getBadges(runs = []) {
  const totalRuns = runs.length;
  const totalKm = runs.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
  const bestPace = runs.length > 0 ? Math.min(...runs.map((r) => r.paceMinKm || 99)) : 99;
  const maxSingleRunKm = runs.length > 0 ? Math.max(...runs.map((r) => r.distanceKm || 0)) : 0;
  const speedMultiplierCount = runs.filter((r) => r.speedMultiplier >= 5).length;
  const hasGpsRun = runs.some((r) => r.mode === 'gps');

  const badges = [
    {
      id: 'first_run',
      title: 'Primeira Passada',
      desc: 'Conclua a 1ª corrida',
      icon: Award,
      unlocked: totalRuns >= 1,
      progress: Math.min(1, totalRuns / 1),
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
      desc: '5 km em 1 sessão',
      icon: Flame,
      unlocked: maxSingleRunKm >= 5,
      progress: Math.min(1, maxSingleRunKm / 5),
    },
    {
      id: 'runner_pro',
      title: 'Mestre da Pista',
      desc: '10 km no total',
      icon: Crown,
      unlocked: totalKm >= 10,
      progress: Math.min(1, totalKm / 10),
    },
    {
      id: 'streak_3',
      title: 'Ritmo Constante',
      desc: '3 corridas no total',
      icon: Activity,
      unlocked: totalRuns >= 3,
      progress: Math.min(1, totalRuns / 3),
    },
    {
      id: 'streak_7',
      title: 'Semana Intensa',
      desc: '7 corridas no total',
      icon: TrendingUp,
      unlocked: totalRuns >= 7,
      progress: Math.min(1, totalRuns / 7),
    },
    {
      id: 'half_marathon',
      title: 'Meia Maratona',
      desc: '21 km no total',
      icon: Map,
      unlocked: totalKm >= 21,
      progress: Math.min(1, totalKm / 21),
    },
    {
      id: 'marathon',
      title: 'Maratonista',
      desc: '42 km no total',
      icon: Target,
      unlocked: totalKm >= 42,
      progress: Math.min(1, totalKm / 42),
    },
    {
      id: 'sub_5_pace',
      title: 'Relâmpago',
      desc: 'Pace abaixo de 5:00/km',
      icon: Zap,
      unlocked: bestPace < 5.0,
    },
    {
      id: 'century',
      title: 'Centenário',
      desc: '100 km no total',
      icon: Trophy,
      unlocked: totalKm >= 100,
      progress: Math.min(1, totalKm / 100),
    },
    {
      id: 'speed_multiplier_5',
      title: 'Turbo',
      desc: 'Usou 5x velocidade em simulação',
      icon: Gauge,
      unlocked: speedMultiplierCount >= 5,
      progress: Math.min(1, speedMultiplierCount / 5),
    },
    {
      id: 'gps_pioneer',
      title: 'GPS Real',
      desc: 'Corrida com GPS concluída',
      icon: Navigation,
      unlocked: hasGpsRun,
    },
  ];

  return badges;
}
