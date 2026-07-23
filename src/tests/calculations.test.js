import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  calculatePace,
  calculateSpeed,
  calculateCalories,
  calculatePerformanceDiff,
} from '../utils/calculations';

describe('calculateHaversineDistance', () => {
  it('retorna 0 para coordenadas inválidas', () => {
    expect(calculateHaversineDistance(null, null, null, null)).toBe(0);
    expect(calculateHaversineDistance(0, 0, null, null)).toBe(0);
  });

  it('retorna 0 para pontos idênticos', () => {
    const dist = calculateHaversineDistance(-23.55, -46.63, -23.55, -46.63);
    expect(dist).toBe(0);
  });

  it('calcula distância real entre dois pontos conhecidos', () => {
    // Pico do Jaraguá -> Parque Ibirapuera em São Paulo ≈ ~25 km
    const dist = calculateHaversineDistance(-23.4563, -46.7659, -23.5874, -46.6576);
    expect(dist).toBeGreaterThan(15);
    expect(dist).toBeLessThan(25);
  });

  it('calcula distância curta com precisão adequada', () => {
    // Dois pontos a ~100m de distância
    const dist = calculateHaversineDistance(-23.5874, -46.6576, -23.5883, -46.6576);
    expect(dist).toBeGreaterThan(0.05);
    expect(dist).toBeLessThan(0.2);
  });
});

describe('calculatePace', () => {
  it('retorna 0 para entradas inválidas', () => {
    expect(calculatePace(0, 100)).toBe(0);
    expect(calculatePace(5, 0)).toBe(0);
    expect(calculatePace(null, 600)).toBe(0);
    expect(calculatePace(-1, 600)).toBe(0);
  });

  it('calcula pace corretamente para 2km em 12min', () => {
    const pace = calculatePace(2.0, 720); // 720s = 12min
    expect(pace).toBe(6.0); // 6 min/km
  });

  it('calcula pace corretamente para 5km em 25min', () => {
    const pace = calculatePace(5.0, 1500); // 1500s = 25min
    expect(pace).toBe(5.0); // 5 min/km
  });
});

describe('calculateSpeed', () => {
  it('retorna 0 para entradas inválidas', () => {
    expect(calculateSpeed(0, 100)).toBe(0);
    expect(calculateSpeed(5, 0)).toBe(0);
  });

  it('calcula velocidade de 10 km/h para 5km em 30min', () => {
    const speed = calculateSpeed(5.0, 1800); // 1800s = 0.5h
    expect(speed).toBe(10.0);
  });

  it('calcula velocidade de 12 km/h para 2km em 10min', () => {
    const speed = calculateSpeed(2.0, 600); // 600s = 10min = 1/6h
    expect(speed).toBe(12.0);
  });
});

describe('calculateCalories', () => {
  it('retorna 0 para distância inválida', () => {
    expect(calculateCalories(0, 600)).toBe(0);
    expect(calculateCalories(null, 600)).toBe(0);
    expect(calculateCalories(-1, 600)).toBe(0);
  });

  it('retorna valor positivo para corrida real', () => {
    const cal = calculateCalories(5.0, 1500, 70);
    expect(cal).toBeGreaterThan(100);
    expect(cal).toBeLessThan(800);
  });
});

describe('calculatePerformanceDiff', () => {
  it('retorna 0% para valores zerados', () => {
    const result = calculatePerformanceDiff(0, 0);
    expect(result.percent).toBe(0);
  });

  it('identifica corrida mais rápida corretamente', () => {
    // Pace atual 5.0 vs média anterior 6.0 => melhoria
    const result = calculatePerformanceDiff(5.0, 6.0);
    expect(result.isBetter).toBe(true);
    expect(result.percent).toBeGreaterThan(0);
  });

  it('identifica corrida mais lenta corretamente', () => {
    // Pace atual 7.0 vs média anterior 5.0 => piora
    const result = calculatePerformanceDiff(7.0, 5.0);
    expect(result.isBetter).toBe(false);
    expect(result.percent).toBeLessThan(0);
  });
});
