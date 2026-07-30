import { describe, it, expect } from 'vitest';
import {
  estimateMaxHeartRate,
  estimateVo2Max,
  calculateHeartRateZones,
  metForSpeed,
  kmToMiles,
  paceMinKmToMinMile,
} from '../utils/calculations';
import { resolveMaxHeartRate, getMetricConfidence } from '../services/physioEstimation';
import { estimateGradeEffort, describeTerrain } from '../services/elevationService';

describe('estimateMaxHeartRate', () => {
  it('usa a fórmula de Tanaka (208 - 0,7 × idade)', () => {
    expect(estimateMaxHeartRate(30)).toBe(187);
    expect(estimateMaxHeartRate(50)).toBe(173);
  });

  it('cai para o padrão com idade inválida', () => {
    expect(estimateMaxHeartRate(0)).toBe(190);
    expect(estimateMaxHeartRate(null)).toBe(190);
    expect(estimateMaxHeartRate(NaN)).toBe(190);
  });
});

describe('resolveMaxHeartRate', () => {
  it('prefere o valor medido quando plausível', () => {
    expect(resolveMaxHeartRate(30, 195)).toBe(195);
  });

  it('ignora valores fora da faixa fisiológica', () => {
    expect(resolveMaxHeartRate(30, 40)).toBe(187);
    expect(resolveMaxHeartRate(30, 300)).toBe(187);
    expect(resolveMaxHeartRate(30, null)).toBe(187);
  });
});

describe('estimateVo2Max', () => {
  it('retorna 0 para entradas insuficientes', () => {
    expect(estimateVo2Max(0.5, 200)).toBe(0);
    expect(estimateVo2Max(5, 0)).toBe(0);
    expect(estimateVo2Max(null, null)).toBe(0);
  });

  it('produz valor plausível para 10 km em 50 min', () => {
    const vo2 = estimateVo2Max(10, 3000);
    expect(vo2).toBeGreaterThan(35);
    expect(vo2).toBeLessThan(60);
  });

  it('corrida mais rápida gera VO2máx maior', () => {
    expect(estimateVo2Max(10, 2400)).toBeGreaterThan(estimateVo2Max(10, 3600));
  });
});

describe('calculateHeartRateZones', () => {
  it('retorna sempre as 5 zonas', () => {
    expect(calculateHeartRateZones([], 190).length).toBe(5);
  });

  it('zera os tempos sem amostras', () => {
    const zones = calculateHeartRateZones([], 190);
    expect(zones.every((z) => z.seconds === 0 && z.percent === 0)).toBe(true);
  });

  it('aloca amostras na zona correta', () => {
    // 190 bpm de FC máx: 152 bpm = 80 % → Z4
    const zones = calculateHeartRateZones([{ time: 0, bpm: 152 }], 190);
    expect(zones[3].seconds).toBe(5);
    expect(zones[3].percent).toBe(100);
  });

  it('percentuais somam ~100', () => {
    const samples = [
      { time: 0, bpm: 110 },
      { time: 5, bpm: 130 },
      { time: 10, bpm: 150 },
      { time: 15, bpm: 175 },
    ];
    const total = calculateHeartRateZones(samples, 190).reduce((a, z) => a + z.percent, 0);
    expect(total).toBeGreaterThanOrEqual(99);
    expect(total).toBeLessThanOrEqual(101);
  });

  it('FC acima do máximo cai na zona 5', () => {
    const zones = calculateHeartRateZones([{ time: 0, bpm: 210 }], 190);
    expect(zones[4].seconds).toBe(5);
  });
});

describe('metForSpeed', () => {
  it('cresce monotonicamente com a velocidade', () => {
    const speeds = [5, 7, 9, 11, 13, 15, 17, 20];
    const mets = speeds.map(metForSpeed);
    for (let i = 1; i < mets.length; i++) {
      expect(mets[i]).toBeGreaterThanOrEqual(mets[i - 1]);
    }
  });

  it('retorna 1 (repouso) para velocidade zero', () => {
    expect(metForSpeed(0)).toBe(1);
  });

  it('trata velocidades de parado/caminhada como tal, não como corrida', () => {
    expect(metForSpeed(0.9)).toBeLessThan(2); // deslocamento residual de GPS
    expect(metForSpeed(3)).toBeLessThan(3); // caminhada muito lenta
    expect(metForSpeed(5)).toBeLessThan(5); // caminhada moderada
    expect(metForSpeed(7)).toBeGreaterThanOrEqual(6); // corrida leve
  });
});

describe('conversões imperiais', () => {
  it('converte km para milhas', () => {
    expect(kmToMiles(1.609344)).toBeCloseTo(1, 5);
    expect(kmToMiles(0)).toBe(0);
  });

  it('converte ritmo min/km para min/milha', () => {
    expect(paceMinKmToMinMile(5)).toBeCloseTo(8.0467, 3);
  });
});

describe('estimateGradeEffort', () => {
  it('retorna 1 sem elevação ou distância', () => {
    expect(estimateGradeEffort(0, 100)).toBe(1);
    expect(estimateGradeEffort(10, 0)).toBe(1);
    expect(estimateGradeEffort(null, null)).toBe(1);
  });

  it('aumenta com o ganho por km e satura em 1,4', () => {
    expect(estimateGradeEffort(10, 100)).toBeCloseTo(1.01, 3);
    expect(estimateGradeEffort(1, 10000)).toBe(1.4);
  });
});

describe('describeTerrain', () => {
  it('classifica o relevo por ganho por km', () => {
    expect(describeTerrain(10, 0)).toBe('Plano');
    expect(describeTerrain(10, 100)).toBe('Levemente ondulado');
    expect(describeTerrain(10, 200)).toBe('Ondulado');
    expect(describeTerrain(10, 400)).toBe('Montanhoso');
    expect(describeTerrain(10, 800)).toBe('Trilha íngreme');
  });
});

describe('getMetricConfidence', () => {
  it('marca métricas de GPS como medidas', () => {
    expect(getMetricConfidence('distance', 'gps')).toBe('measured');
    expect(getMetricConfidence('calories', 'gps')).toBe('calculated');
  });

  it('marca métricas do simulador como simuladas', () => {
    expect(getMetricConfidence('distance', 'simulation')).toBe('simulated');
  });

  it('FC é medida somente com sensor Bluetooth', () => {
    expect(getMetricConfidence('heartRate', 'gps', false)).toBe('estimated');
    expect(getMetricConfidence('heartRate', 'gps', true)).toBe('measured');
  });

  it('métrica desconhecida cai para estimada', () => {
    expect(getMetricConfidence('inexistente', 'gps')).toBe('estimated');
  });
});
