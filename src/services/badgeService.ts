import {
  Award,
  Zap,
  Flame,
  Crown,
  Activity,
  TrendingUp,
  Map,
  Target,
  Trophy,
  CalendarCheck,
  Navigation,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { calculateStreakDays } from './statsService';
import type { RunRecord } from '../types/domain';

export interface Badge {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  unlocked: boolean;
  progress?: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export function getBadges(runs: RunRecord[] = []): Badge[] {
  const list = Array.isArray(runs) ? runs : [];
  const totalRuns = list.length;
  const totalKm = list.reduce((acc, r) => acc + (Number(r.distanceKm) || 0), 0);
  const paces = list.map((r) => Number(r.paceMinKm)).filter((p) => p > 0);
  const bestPace = paces.length > 0 ? Math.min(...paces) : Infinity;
  const maxSingleRunKm = list.reduce((acc, r) => Math.max(acc, Number(r.distanceKm) || 0), 0);
  const hasGpsRun = list.some((r) => r.mode === 'gps');
  const streakDays = calculateStreakDays(list);

  return [
    {
      id: 'first_run',
      title: 'Primeira Passada',
      desc: 'Conclua a 1ª corrida',
      icon: Award,
      unlocked: totalRuns >= 1,
      progress: clamp01(totalRuns / 1),
    },
    {
      id: 'speed_demon',
      title: 'Velocista',
      desc: 'Ritmo abaixo de 5:30/km',
      icon: Zap,
      unlocked: bestPace < 5.5,
    },
    {
      id: 'endurance_5k',
      title: 'Resistência 5K',
      desc: '5 km em uma sessão',
      icon: Flame,
      unlocked: maxSingleRunKm >= 5,
      progress: clamp01(maxSingleRunKm / 5),
    },
    {
      id: 'runner_pro',
      title: 'Mestre da Pista',
      desc: '10 km acumulados',
      icon: Crown,
      unlocked: totalKm >= 10,
      progress: clamp01(totalKm / 10),
    },
    {
      id: 'streak_3',
      title: 'Ritmo Constante',
      desc: '3 corridas no total',
      icon: Activity,
      unlocked: totalRuns >= 3,
      progress: clamp01(totalRuns / 3),
    },
    {
      id: 'streak_7',
      title: 'Semana Intensa',
      desc: '7 corridas no total',
      icon: TrendingUp,
      unlocked: totalRuns >= 7,
      progress: clamp01(totalRuns / 7),
    },
    {
      id: 'half_marathon',
      title: 'Meia Maratona',
      desc: '21 km acumulados',
      icon: Map,
      unlocked: totalKm >= 21,
      progress: clamp01(totalKm / 21),
    },
    {
      id: 'marathon',
      title: 'Maratonista',
      desc: '42 km acumulados',
      icon: Target,
      unlocked: totalKm >= 42,
      progress: clamp01(totalKm / 42),
    },
    {
      id: 'sub_5_pace',
      title: 'Relâmpago',
      desc: 'Ritmo abaixo de 5:00/km',
      icon: Zap,
      unlocked: bestPace < 5.0,
    },
    {
      id: 'century',
      title: 'Centenário',
      desc: '100 km acumulados',
      icon: Trophy,
      unlocked: totalKm >= 100,
      progress: clamp01(totalKm / 100),
    },
    {
      id: 'daily_streak_3',
      title: 'Três Dias Seguidos',
      desc: 'Corra 3 dias consecutivos',
      icon: CalendarCheck,
      unlocked: streakDays >= 3,
      progress: clamp01(streakDays / 3),
    },
    {
      id: 'gps_pioneer',
      title: 'GPS Real',
      desc: 'Corrida com GPS concluída',
      icon: Navigation,
      unlocked: hasGpsRun,
    },
  ];
}
