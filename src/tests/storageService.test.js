import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

import { getStoredRuns, saveRun, clearStoredRuns, deleteRun } from '../services/storageService';

describe('getStoredRuns', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('retorna array vazio quando não há dados salvos', () => {
    const runs = getStoredRuns();
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBe(0);
  });

  it('retorna dados salvos quando existem', () => {
    const testData = [{ id: 'run-1', distanceKm: 5 }];
    localStorage.setItem('runova_runs_history_v1', JSON.stringify(testData));
    const runs = getStoredRuns();
    expect(runs.length).toBe(1);
    expect(runs[0].id).toBe('run-1');
  });

  it('retorna array vazio para JSON inválido', () => {
    localStorage.setItem('runova_runs_history_v1', 'invalid-json');
    const runs = getStoredRuns();
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBe(0);
  });

  it('retorna array vazio para dado que não é array', () => {
    localStorage.setItem('runova_runs_history_v1', JSON.stringify({ not: 'array' }));
    const runs = getStoredRuns();
    expect(Array.isArray(runs)).toBe(true);
    expect(runs.length).toBe(0);
  });

  it('não cria dados mock automaticamente', () => {
    const runs = getStoredRuns();
    expect(runs.length).toBe(0);
    expect(localStorage.getItem('runova_runs_history_v1')).toBeNull();
  });
});

describe('saveRun', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('salva nova corrida e retorna lista atualizada', () => {
    const runData = {
      distanceKm: 5.0,
      durationSeconds: 1800,
      paceMinKm: 6.0,
      speedKmh: 10.0,
      calories: 300,
      completedGoal: true,
    };
    const result = saveRun(runData);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].distanceKm).toBe(5.0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0].id).toMatch(/^run-\d+-[a-z0-9]+$/);
    expect(result[0]).toHaveProperty('date');
  });

  it('adiciona nova corrida no início da lista', () => {
    const run1 = saveRun({ distanceKm: 2.0 });
    const run2 = saveRun({ distanceKm: 3.0 });

    expect(run2.length).toBe(2);
    expect(run2[0].distanceKm).toBe(3.0);
    expect(run2[1].distanceKm).toBe(2.0);
  });

  it('gera ID único para cada corrida', () => {
    const run1 = saveRun({ distanceKm: 1 });
    const run2 = saveRun({ distanceKm: 2 });
    expect(run1[0].id).not.toBe(run2[0].id);
  });

  it('valida e normaliza dados da corrida', () => {
    const result = saveRun({ distanceKm: -5, durationSeconds: 'abc', calories: null });
    expect(result[0].distanceKm).toBe(0);
    expect(result[0].durationSeconds).toBe(0);
    expect(result[0].calories).toBe(0);
    expect(result[0].completedGoal).toBe(false);
  });

  it('preserva routePoints e splits válidos', () => {
    const result = saveRun({
      distanceKm: 5,
      routePoints: [[-23.55, -46.63]],
      splits: [{ km: 1, durationSeconds: 360, paceMinKm: 6 }],
    });
    expect(result[0].routePoints).toEqual([[-23.55, -46.63]]);
    expect(result[0].splits).toEqual([{ km: 1, durationSeconds: 360, paceMinKm: 6 }]);
  });

  it('inicializa routePoints vazio se não fornecido', () => {
    const result = saveRun({ distanceKm: 5 });
    expect(result[0].routePoints).toEqual([]);
  });

  it('inicializa splits vazio se não fornecido', () => {
    const result = saveRun({ distanceKm: 5 });
    expect(result[0].splits).toEqual([]);
  });

  it('salva dados completos de corrida real', () => {
    const fullRun = {
      distanceKm: 10.5,
      targetDistanceKm: 10.0,
      durationSeconds: 3780,
      targetDurationSeconds: 3600,
      paceMinKm: 6.0,
      speedKmh: 10.0,
      calories: 650,
      completedGoal: true,
      routePoints: [[-23.55, -46.63], [-23.56, -46.64]],
      splits: [
        { km: 1, durationSeconds: 360, paceMinKm: 6.0, isBest: false },
        { km: 2, durationSeconds: 350, paceMinKm: 5.83, isBest: true },
      ],
    };
    const result = saveRun(fullRun);
    expect(result[0].distanceKm).toBe(10.5);
    expect(result[0].targetDistanceKm).toBe(10.0);
    expect(result[0].durationSeconds).toBe(3780);
    expect(result[0].completedGoal).toBe(true);
    expect(result[0].routePoints.length).toBe(2);
    expect(result[0].splits.length).toBe(2);
  });
});

describe('clearStoredRuns', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('limpa todas as corridas salvas', () => {
    saveRun({ distanceKm: 5 });
    saveRun({ distanceKm: 3 });
    const result = clearStoredRuns();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
    expect(localStorage.getItem('runova_runs_history_v1')).toBeNull();
  });

  it('retorna array vazio se já estava vazio', () => {
    const result = clearStoredRuns();
    expect(result).toEqual([]);
  });
});

describe('integração storageService + getStoredRuns', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saveRun seguido de getStoredRuns retorna dados consistentes', () => {
    saveRun({ distanceKm: 5.0, durationSeconds: 1800 });
    const runs = getStoredRuns();
    expect(runs.length).toBe(1);
    expect(runs[0].distanceKm).toBe(5.0);
  });

  it('múltiplos saves são preservados na ordem', () => {
    saveRun({ distanceKm: 1.0 });
    saveRun({ distanceKm: 2.0 });
    saveRun({ distanceKm: 3.0 });
    const runs = getStoredRuns();
    expect(runs.length).toBe(3);
    expect(runs[0].distanceKm).toBe(3.0);
    expect(runs[1].distanceKm).toBe(2.0);
    expect(runs[2].distanceKm).toBe(1.0);
  });

  it('clearStoredRuns seguido de getStoredRuns retorna vazio', () => {
    saveRun({ distanceKm: 5 });
    clearStoredRuns();
    const runs = getStoredRuns();
    expect(runs.length).toBe(0);
  });
});

describe('deleteRun', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('remove corrida específica por ID', () => {
    const result = saveRun({ distanceKm: 5 });
    const savedId = result[0].id;

    const updated = deleteRun(savedId);
    expect(updated.length).toBe(0);
  });

  it('preserva outras corridas ao deletar uma específica', () => {
    saveRun({ distanceKm: 1 });
    saveRun({ distanceKm: 2 });
    const saved = saveRun({ distanceKm: 3 });
    const idToDelete = saved[1].id;

    const updated = deleteRun(idToDelete);
    expect(updated.length).toBe(2);
    expect(updated[0].distanceKm).toBe(3);
    expect(updated[1].distanceKm).toBe(1);
  });

  it('retorna array vazio se não houver corridas', () => {
    const result = deleteRun('any-id');
    expect(result).toEqual([]);
  });
});

describe('validateRunData (via saveRun)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('preserva campo mode ao salvar', () => {
    const result = saveRun({ distanceKm: 5, mode: 'gps' });
    expect(result[0].mode).toBe('gps');
  });

  it('usa simulation como mode padrão', () => {
    const result = saveRun({ distanceKm: 5 });
    expect(result[0].mode).toBe('simulation');
  });
});
