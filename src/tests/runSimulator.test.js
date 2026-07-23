import { describe, it, expect } from 'vitest';
import { createInitialRunState, tickRunSimulation, tickGpsRun, processGpsUpdate } from '../services/runEngine';
import { estimateHeartRate, estimateCadence, smoothRollingPaces } from '../services/physioEstimation';

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

  it('inicializa telemetria pro com modelo fisiológico (BPM e cadência)', () => {
    const state = createInitialRunState();
    expect(state.heartRateBpm).toBeGreaterThanOrEqual(90);
    expect(state.heartRateBpm).toBeLessThanOrEqual(120);
    expect(state.cadenceSpm).toBeGreaterThanOrEqual(155);
    expect(state.cadenceSpm).toBeLessThanOrEqual(170);
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

  it('não gera routePoints no modo GPS', () => {
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

describe('tickRunSimulation - BPM e Cadência (modelo fisiológico)', () => {
  it('gera heartRateBpm dentro de faixa realista', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    for (let i = 0; i < 60; i++) {
      state = tickRunSimulation(state, 1);
      expect(state.heartRateBpm).toBeGreaterThanOrEqual(80);
      expect(state.heartRateBpm).toBeLessThanOrEqual(195);
    }
  });

  it('cadenceSpm dentro de faixa realista', () => {
    let state = { ...createInitialRunState(5, 30, 'simulation'), status: 'running' };
    for (let i = 0; i < 60; i++) {
      state = tickRunSimulation(state, 1);
      expect(state.cadenceSpm).toBeGreaterThanOrEqual(145);
      expect(state.cadenceSpm).toBeLessThanOrEqual(195);
    }
  });

  it('BPM aumenta com maior velocidade', () => {
    const slowState = { ...createInitialRunState(10, 60, 'simulation'), status: 'running', speedKmh: 6, elapsedSeconds: 60 };
    const fastState = { ...createInitialRunState(10, 60, 'simulation'), status: 'running', speedKmh: 14, elapsedSeconds: 60 };
    const slowHR = estimateHeartRate(6, 1);
    const fastHR = estimateHeartRate(14, 1);
    expect(fastHR).toBeGreaterThan(slowHR);
  });

  it('cadência aumenta com maior velocidade', () => {
    const slowCad = estimateCadence(6);
    const fastCad = estimateCadence(14);
    expect(fastCad).toBeGreaterThan(slowCad);
  });
});

describe('tickRunSimulation - modo GPS (compatibilidade)', () => {
  it('não avança distância no modo GPS', () => {
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

  it('modo GPS tem heartRateBpm e cadencia estimados', () => {
    let state = { ...createInitialRunState(5, 30, 'gps'), status: 'running' };
    state = tickRunSimulation(state, 10);
    expect(state.heartRateBpm).toBeGreaterThan(0);
    expect(state.cadenceSpm).toBeGreaterThan(0);
  });
});

describe('tickGpsRun', () => {
  it('não altera distância (vem do GPS)', () => {
    const state = { ...createInitialRunState(10, 60, 'gps'), status: 'running', currentDistanceKm: 3.5 };
    const next = tickGpsRun(state, 1);
    expect(next.currentDistanceKm).toBe(3.5);
    expect(next.elapsedSeconds).toBeGreaterThan(0);
  });

  it('atualiza avgPaceMinKm baseado na distância fornecida pelo GPS', () => {
    const state = {
      ...createInitialRunState(10, 60, 'gps'),
      status: 'running',
      currentDistanceKm: 3.5,
      elapsedSeconds: 1200,
    };
    const next = tickGpsRun(state, 1);
    expect(next.avgPaceMinKm).toBeGreaterThan(0);
  });

  it('estima BPM e cadência pela velocidade real', () => {
    const state = {
      ...createInitialRunState(10, 60, 'gps'),
      status: 'running',
      currentDistanceKm: 3.5,
      elapsedSeconds: 900,
      speedKmh: 10.5,
    };
    const next = tickGpsRun(state, 1);
    expect(next.heartRateBpm).toBeGreaterThan(80);
    expect(next.cadenceSpm).toBeGreaterThan(145);
  });

  it('não completa corrida apenas por tempo (depende da distância GPS)', () => {
    const state = { ...createInitialRunState(5, 30, 'gps'), status: 'running', currentDistanceKm: 2.0 };
    const next = tickGpsRun(state, 100);
    expect(next.status).toBe('running');
  });

  it('preserva currentPaceMinKm (vem do rolling GPS)', () => {
    const state = {
      ...createInitialRunState(10, 60, 'gps'),
      status: 'running',
      currentPaceMinKm: 5.3,
    };
    const next = tickGpsRun(state, 1);
    expect(next.currentPaceMinKm).toBe(5.3);
  });
});

describe('processGpsUpdate', () => {
  it('retorna null se não estiver running', () => {
    const state = { ...createInitialRunState(5, 30, 'gps'), status: 'paused' };
    const result = processGpsUpdate(state, -23.5, -46.6, 10, 50000);
    expect(result).toBeNull();
  });

  it('atualiza distância com Haversine a partir de lastPosition', () => {
    const state = {
      ...createInitialRunState(10, 60, 'gps'),
      status: 'running',
      lastPosition: { lat: -23.587, lon: -46.657 },
      lastGpsTimestamp: 0,
    };
    const result = processGpsUpdate(state, -23.586, -46.657, 8, 60000);
    expect(result.currentDistanceKm).toBeGreaterThan(0);
    expect(result.routePoints.length).toBe(1);
  });

  it('atualiza currentPaceMinKm baseado no delta GPS', () => {
    const state = {
      ...createInitialRunState(10, 60, 'gps'),
      status: 'running',
      lastPosition: { lat: -23.587, lon: -46.657 },
      lastGpsTimestamp: 0,
      elapsedSeconds: 100,
      currentPaceMinKm: 6.0,
    };
    const result = processGpsUpdate(state, -23.586, -46.657, 8, 60000);
    expect(result.currentPaceMinKm).toBeGreaterThan(0);
  });

  it('filtra pulos de distância por velocidade > 45 km/h', () => {
    const state = {
      ...createInitialRunState(10, 60, 'gps'),
      status: 'running',
      lastPosition: { lat: -23.587, lon: -46.657 },
      lastGpsTimestamp: 0,
    };
    const result = processGpsUpdate(state, -22.0, -46.0, 10, 1000);
    expect(result.currentDistanceKm).toBe(0);
  });

  it('marca status completed ao atingir targetDistanceKm', () => {
    const state = {
      ...createInitialRunState(0.5, 60, 'gps'),
      status: 'running',
      lastPosition: { lat: -23.587, lon: -46.657 },
      currentDistanceKm: 0.49,
      lastGpsTimestamp: 0,
    };
    const result = processGpsUpdate(state, -23.58655, -46.657, 8, 60000);
    expect(result.status).toBe('completed');
    expect(result.progressPercent).toBe(100);
  });

  it('atualiza gpsAccuracy', () => {
    const state = { ...createInitialRunState(5, 30, 'gps'), status: 'running', lastPosition: { lat: -23.587, lon: -46.657 }, lastGpsTimestamp: 10000 };
    const result = processGpsUpdate(state, -23.586, -46.657, 5, 20000);
    expect(result.gpsAccuracy).toBe(5);
  });

  it('cria splits baseados na distância real do GPS', () => {
    let state = {
      ...createInitialRunState(10, 60, 'gps'),
      status: 'running',
      currentDistanceKm: 0.95,
      lastPosition: { lat: -23.587, lon: -46.657 },
      elapsedSeconds: 320,
      lastGpsTimestamp: 0,
    };
    const result = processGpsUpdate(state, -23.58655, -46.657, 8, 60000);
    expect(result.splits.length).toBeGreaterThanOrEqual(1);
    if (result.splits.length > 0) {
      expect(result.splits[0].km).toBe(1);
    }
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

describe('physioEstimation', () => {
  it('estimateHeartRate retorna valores entre restingHr e maxHr', () => {
    for (let speed = 0; speed <= 20; speed += 1) {
      const hr = estimateHeartRate(speed, 5);
      expect(hr).toBeGreaterThanOrEqual(55);
      expect(hr).toBeLessThanOrEqual(190);
    }
  });

  it('estimateHeartRate aumenta com velocidade', () => {
    const hr1 = estimateHeartRate(5, 1);
    const hr2 = estimateHeartRate(15, 1);
    expect(hr2).toBeGreaterThan(hr1);
  });

  it('estimateHeartRate tem pequeno drift com tempo', () => {
    const hr1 = estimateHeartRate(10, 1);
    const hr2 = estimateHeartRate(10, 60);
    expect(hr2).toBeGreaterThanOrEqual(hr1);
  });

  it('estimateCadence retorna entre 145 e 195', () => {
    for (let speed = 0; speed <= 20; speed += 2) {
      const cad = estimateCadence(speed);
      expect(cad).toBeGreaterThanOrEqual(145);
      expect(cad).toBeLessThanOrEqual(195);
    }
  });

  it('smoothRollingPaces com array vazio retorna 0', () => {
    expect(smoothRollingPaces([], 5)).toBe(0);
  });

  it('smoothRollingPaces retorna média correta', () => {
    expect(smoothRollingPaces([5.0, 5.2, 5.4], 5)).toBeCloseTo(5.2, 1);
  });

  it('smoothRollingPaces usa janela correta', () => {
    const paces = [5.0, 5.2, 5.4, 5.6, 5.8, 6.0, 6.2];
    const result = smoothRollingPaces(paces, 3);
    expect(result).toBeCloseTo((5.8 + 6.0 + 6.2) / 3, 1);
  });
});
