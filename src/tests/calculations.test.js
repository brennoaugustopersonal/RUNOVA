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
    expect(calculateHaversineDistance(undefined, undefined, undefined, undefined)).toBe(0);
    expect(calculateHaversineDistance(NaN, NaN, NaN, NaN)).toBe(0);
  });

  it('retorna 0 para pontos idênticos', () => {
    expect(calculateHaversineDistance(-23.55, -46.63, -23.55, -46.63)).toBe(0);
  });

  it('retorna 0 para strings vazias', () => {
    expect(calculateHaversineDistance('', '', '', '')).toBe(0);
  });

  it('calcula distância real entre dois pontos conhecidos', () => {
    const dist = calculateHaversineDistance(-23.4563, -46.7659, -23.5874, -46.6576);
    expect(dist).toBeGreaterThan(15);
    expect(dist).toBeLessThan(25);
  });

  it('calcula distância curta com precisão adequada (~100m)', () => {
    const dist = calculateHaversineDistance(-23.5874, -46.6576, -23.5883, -46.6576);
    expect(dist).toBeGreaterThan(0.05);
    expect(dist).toBeLessThan(0.2);
  });

  it('distância entre pontos no mesmo meridiano', () => {
    const dist = calculateHaversineDistance(0, 0, 0, 1);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });

  it('distância entre pontos no mesmo paralelo', () => {
    const dist = calculateHaversineDistance(0, 0, 1, 0);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(120);
  });

  it('distância entre pontos opostos (antípodas)', () => {
    const dist = calculateHaversineDistance(0, 0, 0, 180);
    expect(dist).toBeGreaterThan(20000);
    expect(dist).toBeLessThan(21000);
  });

  it('lida com coordenadas próximo aos polos', () => {
    const dist = calculateHaversineDistance(89, 0, 89, 10);
    expect(dist).toBeGreaterThan(0);
    expect(dist).toBeLessThan(200);
  });

  it('simétrico: distância A->B igual B->A', () => {
    const d1 = calculateHaversineDistance(-23.55, -46.63, -23.60, -46.65);
    const d2 = calculateHaversineDistance(-23.60, -46.65, -23.55, -46.63);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });
});

describe('calculatePace', () => {
  it('retorna 0 para entradas inválidas', () => {
    expect(calculatePace(0, 100)).toBe(0);
    expect(calculatePace(5, 0)).toBe(0);
    expect(calculatePace(null, 600)).toBe(0);
    expect(calculatePace(-1, 600)).toBe(0);
    expect(calculatePace(undefined, 600)).toBe(0);
    expect(calculatePace(NaN, 600)).toBe(0);
    expect(calculatePace(5, null)).toBe(0);
    expect(calculatePace(5, NaN)).toBe(0);
    expect(calculatePace(5, -1)).toBe(0);
  });

  it('calcula pace corretamente para 2km em 12min', () => {
    expect(calculatePace(2.0, 720)).toBe(6.0);
  });

  it('calcula pace corretamente para 5km em 25min', () => {
    expect(calculatePace(5.0, 1500)).toBe(5.0);
  });

  it('calcula pace para 10km em 1h', () => {
    expect(calculatePace(10.0, 3600)).toBe(6.0);
  });

  it('calcula pace para corrida muito rápida (3min/km)', () => {
    expect(calculatePace(3.0, 540)).toBe(3.0);
  });

  it('calcula pace para distância muito pequena', () => {
    const pace = calculatePace(0.1, 60);
    expect(pace).toBe(10.0);
  });

  it('lida com distâncias fracionárias', () => {
    const pace = calculatePace(3.7, 1332);
    expect(pace).toBeCloseTo(6.0, 2);
  });
});

describe('calculateSpeed', () => {
  it('retorna 0 para entradas inválidas', () => {
    expect(calculateSpeed(0, 100)).toBe(0);
    expect(calculateSpeed(5, 0)).toBe(0);
    expect(calculateSpeed(null, 600)).toBe(0);
    expect(calculateSpeed(undefined, 600)).toBe(0);
    expect(calculateSpeed(NaN, 600)).toBe(0);
    expect(calculateSpeed(5, null)).toBe(0);
    expect(calculateSpeed(5, NaN)).toBe(0);
    expect(calculateSpeed(-1, 600)).toBe(0);
    expect(calculateSpeed(5, -1)).toBe(0);
  });

  it('calcula velocidade de 10 km/h para 5km em 30min', () => {
    expect(calculateSpeed(5.0, 1800)).toBe(10.0);
  });

  it('calcula velocidade de 12 km/h para 2km em 10min', () => {
    expect(calculateSpeed(2.0, 600)).toBe(12.0);
  });

  it('calcula velocidade maratona (42.195km em 3h30min)', () => {
    const speed = calculateSpeed(42.195, 12600);
    expect(speed).toBeCloseTo(12.06, 1);
  });

  it('velocidade para corrida lenta (6km/h)', () => {
    expect(calculateSpeed(5.0, 3000)).toBe(6.0);
  });

  it('velocidade para distância muito pequena', () => {
    const speed = calculateSpeed(0.1, 60);
    expect(speed).toBeCloseTo(6.0, 1);
  });
});

describe('calculateCalories', () => {
  it('retorna 0 para distância inválida', () => {
    expect(calculateCalories(0, 600)).toBe(0);
    expect(calculateCalories(null, 600)).toBe(0);
    expect(calculateCalories(undefined, 600)).toBe(0);
    expect(calculateCalories(NaN, 600)).toBe(0);
    expect(calculateCalories(-1, 600)).toBe(0);
  });

  it('retorna valor positivo para corrida real', () => {
    const cal = calculateCalories(5.0, 1500, 70);
    expect(cal).toBeGreaterThan(100);
    expect(cal).toBeLessThan(800);
  });

  it('mais peso = mais calorias', () => {
    const calLight = calculateCalories(5.0, 1800, 60);
    const calHeavy = calculateCalories(5.0, 1800, 90);
    expect(calHeavy).toBeGreaterThan(calLight);
  });

  it('mais velocidade = mais calorias por hora (MET mais alto)', () => {
    const calPerHourSlow = calculateCalories(10.0, 3600, 72);
    const calPerHourFast = calculateCalories(10.0, 1800, 72);
    expect(calPerHourFast).toBeGreaterThan(0);
    expect(calPerHourSlow).toBeGreaterThan(0);
  });

  it('usa peso padrão 72kg quando não especificado', () => {
    const cal = calculateCalories(5.0, 1800);
    expect(cal).toBeGreaterThan(0);
  });

  it('retorna distância * 65 como fallback quando calorias calculadas zeram', () => {
    const cal = calculateCalories(0, 600, 72);
    expect(cal).toBe(0);
  });
});

describe('calculatePerformanceDiff', () => {
  it('retorna 0% para valores zerados', () => {
    const result = calculatePerformanceDiff(0, 0);
    expect(result.percent).toBe(0);
    expect(result.isBetter).toBe(true);
    expect(result.diffFormatted).toBe('0%');
  });

  it('retorna 0% para valores nulos', () => {
    expect(calculatePerformanceDiff(null, 5).percent).toBe(0);
    expect(calculatePerformanceDiff(5, null).percent).toBe(0);
    expect(calculatePerformanceDiff(undefined, 5).percent).toBe(0);
    expect(calculatePerformanceDiff(-1, 5).percent).toBe(0);
    expect(calculatePerformanceDiff(5, -1).percent).toBe(0);
  });

  it('identifica corrida mais rápida corretamente', () => {
    const result = calculatePerformanceDiff(5.0, 6.0);
    expect(result.isBetter).toBe(true);
    expect(result.percent).toBeGreaterThan(0);
    expect(result.diffFormatted).toContain('+');
  });

  it('identifica corrida mais lenta corretamente', () => {
    const result = calculatePerformanceDiff(7.0, 5.0);
    expect(result.isBetter).toBe(false);
    expect(result.percent).toBeLessThan(0);
    expect(result.diffFormatted).toContain('-');
  });

  it('retorna 0% quando paces são iguais', () => {
    const result = calculatePerformanceDiff(5.0, 5.0);
    expect(result.percent).toBe(0);
    expect(result.isBetter).toBe(true);
    expect(result.diffFormatted).toBe('+0.0%');
  });

  it('formata corretamente a diferença percentual', () => {
    const result = calculatePerformanceDiff(4.5, 5.0);
    expect(result.diffFormatted).toMatch(/^[+-]\d+\.\d%$/);
    expect(result.diffFormatted).toContain('%');
  });

  it('calcula percentual correto para melhoria de 20%', () => {
    const result = calculatePerformanceDiff(4.0, 5.0);
    expect(result.percent).toBeCloseTo(20.0, 0);
    expect(result.isBetter).toBe(true);
  });

  it('lida com valores extremos de pace', () => {
    const result = calculatePerformanceDiff(2.0, 10.0);
    expect(result.isBetter).toBe(true);
    expect(result.percent).toBeGreaterThan(50);
  });
});
