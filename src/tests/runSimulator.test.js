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
    expect(state.mode).toBe('simulation');
    expect(state.speedMultiplier).toBe(1);
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

  it('garante duração mínima mesmo para valores negativos', () => {
    const state = createInitialRunState(1.0, -10);
    expect(state.targetDurationSeconds).toBe(60);
  });

  it('inicializa telemetria pro (BPM e cadência)', () => {
    const state = createInitialRunState();
    expect(state.heartRateBpm).toBe(142);
    expect(state.cadenceSpm).toBe(168);
  });

  it('inicializa campos de rastreamento', () => {
    const state = createInitialRunState();
    expect(state.lastPosition).toBeNull();
    expect(state.gpsAccuracy).toBeNull();
    expect(state.lastKmMarked).toBe(0);
    expect(state.routePoints).toEqual([]);
    expect(state.splits).toEqual([]);
  });

  it('converte targetDistanceKm para Number', () => {
    const state = createInitialRunState('5.5', 30);
    expect(state.targetDistanceKm).toBe(5.5);
  });

  it('calcula targetPaceMinKm corretamente', () => {
    const state = createInitialRunState(10, 60);
    expect(state.targetPaceMinKm).toBe(6.0);
  });
});

describe('tickRunSimulation - básico', () => {
  it('não altera estado se não estiver running', () => {
    const state = createInitialRunState();
    const next = tickRunSimulation(state, 1);
    expect(next.elapsedSeconds).toBe(0);
    expect(next.currentDistanceKm).toBe(0);
  });

  it('não altera estado se status for paused', () => {
    const state = { ...createInitialRunState(), status: 'paused' };
    const next = tickRunSimulation(state, 5);
    expect(next.elapsedSeconds).toBe(0);
  });

  it('não altera estado se status for completed', () => {
    const state = { ...createInitialRunState(), status: 'completed' };
    const next = tickRunSimulation(state, 5);
    expect(next.elapsedSeconds).toBe(0);
  });

  it('avança o tempo e distância quando running em simulação', () => {
    const state = { ...createInitialRunState(2.1, 12, 'simulation'), status: 'running' };
    const next = tickRunSimulation(state, 1);
    expect(next.elapsedSeconds).toBeGreaterThan(0);
    expect(next.currentDistanceKm).toBeGreaterThan(0);
    expect(next.progressPercent).toBeGreaterThan(0);
    expect(next.calories).toBeGreaterThanOrEqual(0);
    expect(next.status).toBe('running');
  });

  it('calcula calorias corretamente', () => {
    const state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running' };
    const next = tickRunSimulation(state, 60);
    expect(next.calories).toBeGreaterThan(0);
  });

  it('atualiza avgPaceMinKm após múltiplos ticks', () => {
    let state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running' };
    for (let i = 0; i < 10; i++) {
      state = tickRunSimulation(state, 1);
    }
    expect(state.avgPaceMinKm).toBeGreaterThan(0);
    expect(state.avgPaceMinKm).toBeLessThan(20);
  });
});

describe('tickRunSimulation - progresso e conclusão', () => {
  it('não passa da distância alvo', () => {
    const state = {
      ...createInitialRunState(0.1, 1, 'simulation'),
      status: 'running',
      currentDistanceKm: 0.09,
    };
    const next = tickRunSimulation(state, 120);
    expect(next.currentDistanceKm).toBeLessThanOrEqual(state.targetDistanceKm);
    expect(next.status).toBe('completed');
  });

  it('completa a corrida ao atingir a distância alvo', () => {
    const state = {
      ...createInitialRunState(0.1, 1, 'simulation'),
      status: 'running',
      currentDistanceKm: 0.09,
    };
    const next = tickRunSimulation(state, 120);
    expect(next.status).toBe('completed');
    expect(next.progressPercent).toBe(100);
  });

  it('incrementa progressPercent corretamente', () => {
    const state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running' };
    const next = tickRunSimulation(state, 30);
    expect(next.progressPercent).toBeGreaterThan(0);
    expect(next.progressPercent).toBeLessThanOrEqual(100);
  });

  it('garante progressPercent = 100 ao completar', () => {
    let state = { ...createInitialRunState(0.05, 1, 'simulation'), status: 'running' };
    state = tickRunSimulation(state, 120);
    expect(state.progressPercent).toBe(100);
  });

  it('não ultrapassa 100% de progresso', () => {
    const state = {
      ...createInitialRunState(0.1, 1, 'simulation'),
      status: 'running',
      currentDistanceKm: 0.099,
    };
    const next = tickRunSimulation(state, 120);
    expect(next.progressPercent).toBeLessThanOrEqual(100);
  });
});

describe('tickRunSimulation - speedMultiplier', () => {
  it('respeita speedMultiplier = 5', () => {
    const state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running', speedMultiplier: 5 };
    const next = tickRunSimulation(state, 1);
    expect(next.elapsedSeconds).toBe(5);
  });

  it('respeita speedMultiplier = 10', () => {
    const state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running', speedMultiplier: 10 };
    const next = tickRunSimulation(state, 1);
    expect(next.elapsedSeconds).toBe(10);
  });

  it('usa 1 como speedMultiplier padrão', () => {
    const state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running' };
    const next = tickRunSimulation(state, 1);
    expect(next.elapsedSeconds).toBe(1);
  });

  it('speedMultiplier = 1 não altera elapsedSeconds', () => {
    const state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running', speedMultiplier: 1 };
    const next = tickRunSimulation(state, 5);
    expect(next.elapsedSeconds).toBe(5);
  });

  it('completa corrida mais rápido com speedMultiplier alto', () => {
    let state = { ...createInitialRunState(2.1, 12, 'simulation'), status: 'running', speedMultiplier: 10 };
    let ticks = 0;
    while (state.status === 'running' && ticks < 1000) {
      state = tickRunSimulation(state, 1);
      ticks++;
    }
    expect(state.status).toBe('completed');
    expect(ticks).toBeLessThan(200);
  });
});

describe('tickRunSimulation - routePoints', () => {
  it('gera routePoints no modo simulação', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    state = tickRunSimulation(state, 2);
    expect(state.routePoints.length).toBeGreaterThanOrEqual(1);
  });

  it('cada routePoint é um array [lat, lon]', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    for (let i = 0; i < 10; i++) {
      state = tickRunSimulation(state, 1);
    }
    state.routePoints.forEach((point) => {
      expect(Array.isArray(point)).toBe(true);
      expect(point.length).toBe(2);
      expect(typeof point[0]).toBe('number');
      expect(typeof point[1]).toBe('number');
    });
  });

  it('não gera routePoints no modo GPS (depende de geolocalização real)', () => {
    let state = { ...createInitialRunState(5, 30, 'gps'), status: 'running' };
    state = tickRunSimulation(state, 10);
    expect(state.routePoints.length).toBe(0);
  });

  it('routePoints ficam próximos ao centro do Ibirapuera', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    for (let i = 0; i < 20; i++) {
      state = tickRunSimulation(state, 1);
    }
    state.routePoints.forEach(([lat, lon]) => {
      expect(lat).toBeGreaterThan(-23.6);
      expect(lat).toBeLessThan(-23.57);
      expect(lon).toBeGreaterThan(-46.67);
      expect(lon).toBeLessThan(-46.64);
    });
  });

  it('não adiciona pontos duplicados consecutivos próximos demais', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    for (let i = 0; i < 5; i++) {
      state = tickRunSimulation(state, 1);
    }
    for (let i = 1; i < state.routePoints.length; i++) {
      const [lat1, lon1] = state.routePoints[i - 1];
      const [lat2, lon2] = state.routePoints[i];
      const diff = Math.abs(lat1 - lat2) + Math.abs(lon1 - lon2);
      expect(diff).toBeGreaterThan(0);
    }
  });
});

describe('tickRunSimulation - BPM e Cadência', () => {
  it('gera heartRateBpm dentro de faixa realista', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    for (let i = 0; i < 60; i++) {
      state = tickRunSimulation(state, 1);
      expect(state.heartRateBpm).toBeGreaterThanOrEqual(100);
      expect(state.heartRateBpm).toBeLessThanOrEqual(200);
    }
  });

  it('cadenceSpm dentro de faixa realista', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    for (let i = 0; i < 60; i++) {
      state = tickRunSimulation(state, 1);
      expect(state.cadenceSpm).toBeGreaterThanOrEqual(150);
      expect(state.cadenceSpm).toBeLessThanOrEqual(190);
    }
  });
});

describe('tickRunSimulation - modo GPS', () => {
  it('não avança distância no modo GPS (sem GPS real no teste)', () => {
    const state = { ...createInitialRunState(2, 12, 'gps'), status: 'running' };
    const next = tickRunSimulation(state, 1);
    expect(next.currentDistanceKm).toBe(0);
    expect(next.elapsedSeconds).toBeGreaterThan(0);
  });

  it('mantém distância zerada em GPS mesmo após vários ticks', () => {
    let state = { ...createInitialRunState(5, 30, 'gps'), status: 'running' };
    for (let i = 0; i < 10; i++) {
      state = tickRunSimulation(state, 1);
    }
    expect(state.currentDistanceKm).toBe(0);
    expect(state.elapsedSeconds).toBeGreaterThan(0);
  });

  it('modo GPS tem heartRateBpm e cadencia', () => {
    let state = { ...createInitialRunState(5, 30, 'gps'), status: 'running' };
    state = tickRunSimulation(state, 10);
    expect(state.heartRateBpm).toBeGreaterThan(0);
    expect(state.cadenceSpm).toBeGreaterThan(0);
  });
});

describe('tickRunSimulation - Splits', () => {
  it('cria split ao completar 1km', () => {
    let state = {
      ...createInitialRunState(10, 60, 'simulation'),
      status: 'running',
      currentDistanceKm: 0.95,
    };
    state = tickRunSimulation(state, 30);
    expect(state.splits.length).toBe(1);
    expect(state.splits[0].km).toBe(1);
  });

  it('cria splits sequenciais para múltiplos km', () => {
    let state = { ...createInitialRunState(5, 15, 'simulation'), status: 'running' };
    while (state.status === 'running') {
      state = tickRunSimulation(state, 60);
    }
    expect(state.splits.length).toBeGreaterThanOrEqual(1);
    state.splits.forEach((split, i) => {
      expect(split.km).toBe(i + 1);
      expect(split.durationSeconds).toBeGreaterThan(0);
      expect(split.paceMinKm).toBeGreaterThan(0);
    });
  });

  it('cada split tem campos obrigatórios', () => {
    let state = { ...createInitialRunState(5, 15, 'simulation'), status: 'running' };
    while (state.status === 'running') {
      state = tickRunSimulation(state, 60);
    }
    state.splits.forEach((split) => {
      expect(split).toHaveProperty('km');
      expect(split).toHaveProperty('durationSeconds');
      expect(split).toHaveProperty('paceMinKm');
      expect(split).toHaveProperty('isBest');
    });
  });

  it('marca isBest no split mais rápido', () => {
    let state = { ...createInitialRunState(3, 9, 'simulation'), status: 'running' };
    while (state.status === 'running') {
      state = tickRunSimulation(state, 60);
    }
    const bestSplits = state.splits.filter((s) => s.isBest);
    expect(bestSplits.length).toBeGreaterThanOrEqual(1);
  });

  it('calcula splitPace corretamente', () => {
    let state = {
      ...createInitialRunState(10, 60, 'simulation'),
      status: 'running',
      currentDistanceKm: 0.95,
    };
    state = tickRunSimulation(state, 360);
    if (state.splits.length > 0) {
      expect(state.splits[0].paceMinKm).toBeGreaterThan(0);
    }
  });

  it('último split não ultrapassa targetDistanceKm', () => {
    let state = { ...createInitialRunState(2.1, 12, 'simulation'), status: 'running' };
    while (state.status === 'running') {
      state = tickRunSimulation(state, 30);
    }
    const lastSplit = state.splits[state.splits.length - 1];
    expect(lastSplit.km * 1).toBeLessThanOrEqual(Math.ceil(state.targetDistanceKm));
  });
});

describe('tickRunSimulation - integridade', () => {
  it('não modifica o objeto de estado original (imutabilidade)', () => {
    const state = { ...createInitialRunState(2.1, 12, 'simulation'), status: 'running' };
    const originalElapsed = state.elapsedSeconds;
    const next = tickRunSimulation(state, 5);
    expect(state.elapsedSeconds).toBe(originalElapsed);
    expect(next.elapsedSeconds).toBeGreaterThan(originalElapsed);
  });

  it('elapsedSeconds nunca diminui', () => {
    let state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running' };
    let lastElapsed = -1;
    for (let i = 0; i < 10; i++) {
      state = tickRunSimulation(state, 1);
      expect(state.elapsedSeconds).toBeGreaterThan(lastElapsed);
      lastElapsed = state.elapsedSeconds;
    }
  });

  it('currentDistanceKm nunca diminui', () => {
    let state = { ...createInitialRunState(10, 60, 'simulation'), status: 'running' };
    let lastDist = -1;
    for (let i = 0; i < 10; i++) {
      state = tickRunSimulation(state, 1);
      expect(state.currentDistanceKm).toBeGreaterThanOrEqual(lastDist);
      lastDist = state.currentDistanceKm;
    }
  });

  it('mantém estado consistente em ticks consecutivos', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    for (let i = 0; i < 30; i++) {
      state = tickRunSimulation(state, 1);
      expect(state.elapsedSeconds).toBe(i + 1);
      expect(state.currentDistanceKm).toBeGreaterThanOrEqual(0);
      expect(state.progressPercent).toBeGreaterThanOrEqual(0);
      expect(state.progressPercent).toBeLessThanOrEqual(100);
    }
  });
});
