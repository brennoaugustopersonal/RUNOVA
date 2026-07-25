import { describe, it, expect } from 'vitest';
import {
  calculateStreakDays,
  calculateWeekDistance,
  computeStats,
  getPersonalRecords,
  getBestVo2Max,
  getWeeklyVolume,
} from '../services/statsService';

const NOW = new Date('2026-07-15T12:00:00');

function daysAgo(days, extra = {}) {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  return {
    id: `run-${days}-${Math.random().toString(36).slice(2, 6)}`,
    date: date.toISOString(),
    distanceKm: 5,
    durationSeconds: 1800,
    paceMinKm: 6,
    calories: 350,
    elevationGainM: 0,
    mode: 'gps',
    ...extra,
  };
}

describe('calculateStreakDays', () => {
  it('retorna 0 sem corridas', () => {
    expect(calculateStreakDays([], NOW)).toBe(0);
    expect(calculateStreakDays(null, NOW)).toBe(0);
  });

  it('conta dias consecutivos a partir de hoje', () => {
    const runs = [daysAgo(0), daysAgo(1), daysAgo(2)];
    expect(calculateStreakDays(runs, NOW)).toBe(3);
  });

  it('mantém a sequência viva se a última corrida foi ontem', () => {
    const runs = [daysAgo(1), daysAgo(2)];
    expect(calculateStreakDays(runs, NOW)).toBe(2);
  });

  it('quebra a sequência com lacuna de 2 dias', () => {
    const runs = [daysAgo(2), daysAgo(3)];
    expect(calculateStreakDays(runs, NOW)).toBe(0);
  });

  it('não conta o mesmo dia duas vezes', () => {
    const runs = [daysAgo(0), daysAgo(0), daysAgo(1)];
    expect(calculateStreakDays(runs, NOW)).toBe(2);
  });

  it('ignora datas inválidas', () => {
    const runs = [{ id: 'x', date: 'invalida', distanceKm: 5 }, daysAgo(0)];
    expect(calculateStreakDays(runs, NOW)).toBe(1);
  });
});

describe('calculateWeekDistance', () => {
  it('soma apenas os últimos 7 dias', () => {
    const runs = [daysAgo(0), daysAgo(3), daysAgo(10)];
    expect(calculateWeekDistance(runs, NOW)).toBe(10);
  });

  it('retorna 0 sem corridas', () => {
    expect(calculateWeekDistance([], NOW)).toBe(0);
  });
});

describe('computeStats', () => {
  it('retorna estatísticas zeradas para histórico vazio', () => {
    const stats = computeStats([], NOW);
    expect(stats.totalRuns).toBe(0);
    expect(stats.totalDistanceKm).toBe(0);
    expect(stats.avgPaceMinKm).toBe(0);
    expect(stats.lastRun).toBeNull();
    expect(stats.currentStreakDays).toBe(0);
  });

  it('agrega distância, duração, calorias e elevação', () => {
    const runs = [
      daysAgo(0, { distanceKm: 10, durationSeconds: 3600, calories: 700, elevationGainM: 120 }),
      daysAgo(1, { distanceKm: 5, durationSeconds: 1800, calories: 350, elevationGainM: 30 }),
    ];
    const stats = computeStats(runs, NOW);
    expect(stats.totalRuns).toBe(2);
    expect(stats.totalDistanceKm).toBe(15);
    expect(stats.totalDurationSeconds).toBe(5400);
    expect(stats.totalCalories).toBe(1050);
    expect(stats.totalElevationM).toBe(150);
    expect(stats.avgPaceMinKm).toBe(6);
    expect(stats.currentStreakDays).toBe(2);
  });

  it('lastRun é o primeiro item da lista', () => {
    const runs = [daysAgo(0, { distanceKm: 3 }), daysAgo(1, { distanceKm: 9 })];
    expect(computeStats(runs, NOW).lastRun.distanceKm).toBe(3);
  });
});

describe('getPersonalRecords', () => {
  it('retorna vazio sem corridas', () => {
    expect(getPersonalRecords([])).toEqual([]);
  });

  it('escolhe o melhor ritmo de cada faixa', () => {
    const runs = [
      daysAgo(1, { distanceKm: 5, durationSeconds: 1800, paceMinKm: 6 }),
      daysAgo(2, { distanceKm: 5.2, durationSeconds: 1560, paceMinKm: 5 }),
    ];
    const records = getPersonalRecords(runs);
    const record5k = records.find((r) => r.label === '5 km');
    expect(record5k).toBeDefined();
    expect(record5k.paceMinKm).toBe(5);
    expect(record5k.durationSeconds).toBe(1500); // 5 min/km × 5 km
  });

  it('ignora distâncias abaixo da tolerância', () => {
    const runs = [daysAgo(1, { distanceKm: 2, durationSeconds: 600, paceMinKm: 5 })];
    const labels = getPersonalRecords(runs).map((r) => r.label);
    expect(labels).toContain('1 km');
    expect(labels).not.toContain('5 km');
  });
});

describe('getBestVo2Max', () => {
  it('retorna 0 sem corridas elegíveis', () => {
    expect(getBestVo2Max([])).toBe(0);
    expect(getBestVo2Max([daysAgo(1, { distanceKm: 0.5, durationSeconds: 200 })])).toBe(0);
  });

  it('retorna um valor plausível para 5 km em 25 min', () => {
    const vo2 = getBestVo2Max([daysAgo(1, { distanceKm: 5, durationSeconds: 1500 })]);
    expect(vo2).toBeGreaterThan(30);
    expect(vo2).toBeLessThan(70);
  });
});

describe('getWeeklyVolume', () => {
  it('retorna o número pedido de semanas', () => {
    expect(getWeeklyVolume([], 8, NOW).length).toBe(8);
  });

  it('aloca a corrida na semana correta', () => {
    const buckets = getWeeklyVolume([daysAgo(0, { distanceKm: 7 })], 4, NOW);
    expect(buckets[buckets.length - 1].distanceKm).toBe(7);
    expect(buckets[buckets.length - 1].runs).toBe(1);
  });
});
