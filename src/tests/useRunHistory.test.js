// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRunHistory } from '../hooks/useRunHistory';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('useRunHistory', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  it('começa com lista vazia e stats zerados', () => {
    const { result } = renderHook(() => useRunHistory());

    expect(result.current.runs).toEqual([]);
    expect(result.current.stats.totalRuns).toBe(0);
    expect(result.current.stats.totalDistanceKm).toBe(0);
    expect(result.current.stats.totalDurationSeconds).toBe(0);
    expect(result.current.stats.avgPaceMinKm).toBe(0);
    expect(result.current.stats.lastRun).toBeNull();
  });

  it('addRun adiciona corrida e atualiza estado', () => {
    const { result } = renderHook(() => useRunHistory());

    act(() => {
      result.current.addRun({
        currentDistanceKm: 5.0,
        targetDistanceKm: 5.0,
        elapsedSeconds: 1800,
        targetDurationSeconds: 1800,
        avgPaceMinKm: 6.0,
        speedKmh: 10.0,
        calories: 300,
      });
    });

    expect(result.current.runs.length).toBe(1);
    expect(result.current.runs[0].distanceKm).toBe(5.0);
    expect(result.current.runs[0].completedGoal).toBe(true);
    expect(result.current.stats.totalRuns).toBe(1);
    expect(result.current.stats.totalDistanceKm).toBe(5.0);
  });

  it('addRun salva no localStorage', () => {
    const { result } = renderHook(() => useRunHistory());

    act(() => {
      result.current.addRun({
        currentDistanceKm: 3.0,
        targetDistanceKm: 5.0,
        elapsedSeconds: 1200,
        targetDurationSeconds: 1800,
        avgPaceMinKm: 6.67,
        speedKmh: 9.0,
        calories: 200,
      });
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    const [key, value] = localStorageMock.setItem.mock.calls[0];
    expect(key).toBe('runova_runs_history_v1');
    const saved = JSON.parse(value);
    expect(saved.length).toBe(1);
    expect(saved[0].distanceKm).toBe(3.0);
  });

  it('completedGoal false quando distância menor que alvo', () => {
    const { result } = renderHook(() => useRunHistory());

    act(() => {
      result.current.addRun({
        currentDistanceKm: 3.0,
        targetDistanceKm: 5.0,
        elapsedSeconds: 1200,
        targetDurationSeconds: 1800,
        avgPaceMinKm: 6.67,
        speedKmh: 9.0,
        calories: 200,
      });
    });

    expect(result.current.runs[0].completedGoal).toBe(false);
  });

  it('completedGoal true quando distância >= alvo', () => {
    const { result } = renderHook(() => useRunHistory());

    act(() => {
      result.current.addRun({
        currentDistanceKm: 5.0,
        targetDistanceKm: 5.0,
        elapsedSeconds: 1800,
        targetDurationSeconds: 1800,
        avgPaceMinKm: 6.0,
        speedKmh: 10.0,
        calories: 300,
      });
    });

    expect(result.current.runs[0].completedGoal).toBe(true);
  });

  it('stats são atualizadas com múltiplas corridas', () => {
    const { result } = renderHook(() => useRunHistory());

    act(() => {
      result.current.addRun({ currentDistanceKm: 5.0, targetDistanceKm: 5.0, elapsedSeconds: 1800, targetDurationSeconds: 1800, avgPaceMinKm: 6.0, speedKmh: 10.0, calories: 300 });
    });

    act(() => {
      result.current.addRun({ currentDistanceKm: 10.0, targetDistanceKm: 10.0, elapsedSeconds: 3600, targetDurationSeconds: 3600, avgPaceMinKm: 6.0, speedKmh: 10.0, calories: 600 });
    });

    expect(result.current.stats.totalRuns).toBe(2);
    expect(result.current.stats.totalDistanceKm).toBe(15.0);
    expect(result.current.stats.totalDurationSeconds).toBe(5400);
    expect(result.current.stats.avgPaceMinKm).toBe(6.0);
    expect(result.current.stats.lastRun).not.toBeNull();
    expect(result.current.stats.lastRun.distanceKm).toBe(10.0);
  });

  it('stats.lastRun é a corrida mais recente', () => {
    const { result } = renderHook(() => useRunHistory());

    act(() => {
      result.current.addRun({ currentDistanceKm: 2.0, targetDistanceKm: 2.0, elapsedSeconds: 600, targetDurationSeconds: 600, avgPaceMinKm: 5.0, speedKmh: 12.0, calories: 100 });
    });

    act(() => {
      result.current.addRun({ currentDistanceKm: 5.0, targetDistanceKm: 5.0, elapsedSeconds: 1500, targetDurationSeconds: 1500, avgPaceMinKm: 5.0, speedKmh: 12.0, calories: 300 });
    });

    expect(result.current.stats.lastRun.distanceKm).toBe(5.0);
  });

  it('addRun retorna o primeiro item (recém criado)', () => {
    const { result } = renderHook(() => useRunHistory());

    let returned;
    act(() => {
      returned = result.current.addRun({ currentDistanceKm: 7.5, targetDistanceKm: 7.5, elapsedSeconds: 2700, targetDurationSeconds: 2700, avgPaceMinKm: 6.0, speedKmh: 10.0, calories: 450 });
    });

    expect(returned.distanceKm).toBe(7.5);
    expect(returned.id).toBeDefined();
  });

  it('múltiplas corridas são preservadas em ordem reversa', () => {
    const { result } = renderHook(() => useRunHistory());

    act(() => result.current.addRun({ currentDistanceKm: 1.0, targetDistanceKm: 1.0, elapsedSeconds: 300, targetDurationSeconds: 300, avgPaceMinKm: 5.0, speedKmh: 12.0, calories: 60 }));
    act(() => result.current.addRun({ currentDistanceKm: 2.0, targetDistanceKm: 2.0, elapsedSeconds: 600, targetDurationSeconds: 600, avgPaceMinKm: 5.0, speedKmh: 12.0, calories: 120 }));
    act(() => result.current.addRun({ currentDistanceKm: 3.0, targetDistanceKm: 3.0, elapsedSeconds: 900, targetDurationSeconds: 900, avgPaceMinKm: 5.0, speedKmh: 12.0, calories: 180 }));

    expect(result.current.runs[0].distanceKm).toBe(3.0);
    expect(result.current.runs[1].distanceKm).toBe(2.0);
    expect(result.current.runs[2].distanceKm).toBe(1.0);
  });
});
