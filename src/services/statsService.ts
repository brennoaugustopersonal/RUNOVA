import { calculatePace, estimateVo2Max } from '../utils/calculations';
import type { PersonalRecord, RunRecord, RunStats } from '../types/domain';

/** Chave YYYY-MM-DD no fuso local — base para cálculo de sequência de dias. */
function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(value: string | number | Date | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Dias consecutivos com pelo menos uma corrida, contados de hoje para trás.
 * Uma corrida ontem (sem corrida hoje) ainda mantém a sequência viva.
 */
export function calculateStreakDays(runs: RunRecord[], now = new Date()): number {
  if (!Array.isArray(runs) || runs.length === 0) return 0;

  const days = new Set<string>();
  for (const run of runs) {
    const date = parseDate(run?.date);
    if (date) days.add(localDayKey(date));
  }
  if (days.size === 0) return 0;

  const cursor = new Date(now);
  if (!days.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(localDayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Quilometragem dos últimos 7 dias (janela móvel). */
export function calculateWeekDistance(runs: RunRecord[], now = new Date()): number {
  if (!Array.isArray(runs) || runs.length === 0) return 0;
  const cutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return runs.reduce((acc, run) => {
    const date = parseDate(run?.date);
    if (!date || date.getTime() < cutoff) return acc;
    return acc + (Number(run.distanceKm) || 0);
  }, 0);
}

export function computeStats(runs: RunRecord[], now = new Date()): RunStats {
  if (!Array.isArray(runs) || runs.length === 0) {
    return {
      totalDistanceKm: 0,
      totalDurationSeconds: 0,
      avgPaceMinKm: 0,
      totalRuns: 0,
      totalCalories: 0,
      totalElevationM: 0,
      currentStreakDays: 0,
      thisWeekKm: 0,
      lastRun: null,
    };
  }

  let totalDistanceKm = 0;
  let totalDurationSeconds = 0;
  let totalCalories = 0;
  let totalElevationM = 0;

  for (const run of runs) {
    totalDistanceKm += Number(run.distanceKm) || 0;
    totalDurationSeconds += Number(run.durationSeconds) || 0;
    totalCalories += Number(run.calories) || 0;
    totalElevationM += Number(run.elevationGainM) || 0;
  }

  return {
    totalDistanceKm,
    totalDurationSeconds,
    avgPaceMinKm: calculatePace(totalDistanceKm, totalDurationSeconds),
    totalRuns: runs.length,
    totalCalories,
    totalElevationM,
    currentStreakDays: calculateStreakDays(runs, now),
    thisWeekKm: calculateWeekDistance(runs, now),
    lastRun: runs[0] ?? null,
  };
}

const PR_DISTANCES: ReadonlyArray<{ label: string; km: number; tolerance: number }> = [
  { label: '1 km', km: 1, tolerance: 0.1 },
  { label: '5 km', km: 5, tolerance: 0.3 },
  { label: '10 km', km: 10, tolerance: 0.5 },
  { label: '21 km', km: 21.0975, tolerance: 1 },
  { label: '42 km', km: 42.195, tolerance: 2 },
];

/**
 * Recordes pessoais por distância clássica.
 * Só considera corridas que atingiram a distância (com tolerância) e usa
 * o melhor ritmo como critério — comparável entre distâncias próximas.
 */
export function getPersonalRecords(runs: RunRecord[]): PersonalRecord[] {
  if (!Array.isArray(runs) || runs.length === 0) return [];

  const records: PersonalRecord[] = [];
  for (const target of PR_DISTANCES) {
    const eligible = runs.filter(
      (r) =>
        Number(r.distanceKm) >= target.km - target.tolerance &&
        Number(r.durationSeconds) > 0 &&
        Number(r.paceMinKm) > 0
    );
    if (eligible.length === 0) continue;

    const best = eligible.reduce((a, b) => (a.paceMinKm <= b.paceMinKm ? a : b));
    records.push({
      label: target.label,
      distanceKm: best.distanceKm,
      // Tempo projetado para a distância exata, no ritmo obtido.
      durationSeconds: Math.round(best.paceMinKm * 60 * target.km),
      paceMinKm: best.paceMinKm,
      runId: best.id,
      date: best.date,
    });
  }
  return records;
}

/** Melhor VO2máx estimado entre as corridas de 1,5 km ou mais. */
export function getBestVo2Max(runs: RunRecord[]): number {
  if (!Array.isArray(runs) || runs.length === 0) return 0;
  return runs.reduce((best, run) => {
    if (Number(run.distanceKm) < 1.5) return best;
    const vo2 = estimateVo2Max(run.distanceKm, run.durationSeconds);
    return vo2 > best ? vo2 : best;
  }, 0);
}

export interface WeeklyBucket {
  weekStart: string;
  label: string;
  distanceKm: number;
  runs: number;
}

/** Agrupa a quilometragem por semana (segunda a domingo) nas últimas N semanas. */
export function getWeeklyVolume(runs: RunRecord[], weeks = 8, now = new Date()): WeeklyBucket[] {
  const buckets: WeeklyBucket[] = [];
  const startOfWeek = new Date(now);
  const dayOffset = (startOfWeek.getDay() + 6) % 7; // segunda = 0
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - dayOffset);

  for (let i = weeks - 1; i >= 0; i--) {
    const from = new Date(startOfWeek);
    from.setDate(from.getDate() - i * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);

    let distanceKm = 0;
    let count = 0;
    for (const run of runs) {
      const date = parseDate(run?.date);
      if (!date || date < from || date >= to) continue;
      distanceKm += Number(run.distanceKm) || 0;
      count += 1;
    }

    buckets.push({
      weekStart: localDayKey(from),
      label: `${String(from.getDate()).padStart(2, '0')}/${String(from.getMonth() + 1).padStart(2, '0')}`,
      distanceKm,
      runs: count,
    });
  }
  return buckets;
}
