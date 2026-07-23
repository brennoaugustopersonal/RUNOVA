import { describe, it, expect } from 'vitest';
import { createInitialRunState, tickRunSimulation } from '../services/runSimulator';

describe('createInitialRunState', () => {
  it('cria o estado inicial com valores padrão', () => {
    const state = createInitialRunState();
    expect(state.targetDistanceKm).toBe(2.1);
    expect(state.targetDurationSeconds).toBe(720);
    expect(state.status).toBe('idle');
    expect(state.elapsedSeconds).toBe(0);
    expect(state.currentDistanceKm).toBe(0);
    expect(state.calories).toBe(0);
    expect(state.progressPercent).toBe(0);
    expect(state.splits).toEqual([]);
    expect(state.routePoints).toEqual([]);
  });

  it('aceita parâmetros customizados', () => {
    const state = createInitialRunState(5.0, 25, 'gps');
    expect(state.targetDistanceKm).toBe(5.0);
    expect(state.targetDurationSeconds).toBe(1500);
    expect(state.mode).toBe('gps');
  });

  it('garante duração mínima de 60 segundos', () => {
    const state = createInitialRunState(1.0, 0.5);
    expect(state.targetDurationSeconds).toBe(60);
  });
});

describe('tickRunSimulation', () => {
  it('não altera estado se não estiver rodando', () => {
    const state = createInitialRunState();
    const next = tickRunSimulation(state, 1);
    expect(next.elapsedSeconds).toBe(0);
  });

  it('avança o tempo e distância quando rodando em simulação', () => {
    const state = { ...createInitialRunState(2.1, 12, 'simulation'), status: 'running' };
    const next = tickRunSimulation(state, 1);

    expect(next.elapsedSeconds).toBeGreaterThan(0);
    expect(next.currentDistanceKm).toBeGreaterThan(0);
    expect(next.progressPercent).toBeGreaterThan(0);
    expect(next.calories).toBeGreaterThanOrEqual(0);
  });

  it('não passa da distância alvo', () => {
    const state = {
      ...createInitialRunState(0.01, 1, 'simulation'),
      status: 'running',
      currentDistanceKm: 0.009,
    };
    const next = tickRunSimulation(state, 60);
    expect(next.currentDistanceKm).toBeLessThanOrEqual(state.targetDistanceKm);
    expect(next.status).toBe('completed');
  });

  it('respeita o speedMultiplier', () => {
    const state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running', speedMultiplier: 10 };
    const next = tickRunSimulation(state, 1);
    expect(next.elapsedSeconds).toBe(10);
  });

  it('gera routePoints no modo simulação', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    state = tickRunSimulation(state, 2);
    expect(state.routePoints.length).toBeGreaterThanOrEqual(1);
  });

  it('não avança distância no modo GPS (sem GPS real no teste)', () => {
    const state = { ...createInitialRunState(2, 12, 'gps'), status: 'running' };
    const next = tickRunSimulation(state, 1);
    expect(next.currentDistanceKm).toBe(0);
    expect(next.elapsedSeconds).toBeGreaterThan(0);
  });
});
