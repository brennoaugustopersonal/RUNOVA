// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActiveRun } from '../hooks/useActiveRun';

vi.mock('../services/runEngine', () => ({
  createInitialRunState: vi.fn(),
  tickRunSimulation: vi.fn((state) => ({ ...state })),
  tickGpsRun: vi.fn((state) => ({ ...state })),
  processGpsUpdate: vi.fn((state) => state),
}));

vi.mock('../services/soundService', () => ({
  soundService: {
    playStartSound: vi.fn(),
    playPauseSound: vi.fn(),
    playCelebrationSound: vi.fn(),
  },
}));

vi.mock('../services/voiceService', () => ({
  voiceService: {
    speakStart: vi.fn(),
    speakPause: vi.fn(),
    speakResume: vi.fn(),
    speakFinish: vi.fn(),
    speakKmSplit: vi.fn(),
    speak: vi.fn(),
  },
}));

vi.mock('../services/hapticService', () => ({
  triggerHaptic: vi.fn(),
}));

vi.mock('../services/bluetoothHrService', () => ({
  bluetoothHrService: {
    isSupported: vi.fn(),
    requestDevice: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    onHeartRate: null,
    onDisconnect: null,
  },
}));

vi.mock('../services/storageService', () => ({
  saveActiveRunSnapshot: vi.fn(),
  loadActiveRunSnapshot: vi.fn(() => null),
  clearActiveRunSnapshot: vi.fn(),
  getSettings: vi.fn(() => ({ weightKg: 72, voiceMuted: false, units: 'metric' })),
}));

import { createInitialRunState } from '../services/runEngine';

const mockInitialState = {
  targetDistanceKm: 5,
  targetDurationSeconds: 1800,
  targetPaceMinKm: 6,
  mode: 'simulation',
  elapsedSeconds: 0,
  currentDistanceKm: 0,
  currentPaceMinKm: 6,
  avgPaceMinKm: 6,
  speedKmh: 0,
  calories: 0,
  progressPercent: 0,
  heartRateBpm: 72,
  cadenceSpm: 0,
  routePoints: [],
  lastPosition: null,
  gpsAccuracy: null,
  splits: [],
  lastKmMarked: 0,
  status: 'idle',
  speedMultiplier: 1,
  rollingPaces: [],
  bluetoothHrConnected: false,
  lastGpsTimestamp: null,
};

describe('useActiveRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createInitialRunState.mockReturnValue({ ...mockInitialState });

    Object.defineProperty(globalThis.navigator, 'geolocation', {
      value: {
        watchPosition: vi.fn(() => 1),
        clearWatch: vi.fn(),
      },
      configurable: true,
    });
  });

  it('requestStartRun ativa contagem regressiva e armazena config', () => {
    const { result } = renderHook(() => useActiveRun());

    act(() => {
      result.current.requestStartRun(5, 30, 'simulation');
    });

    expect(result.current.showCountdown).toBe(true);
    expect(result.current.runState).toBeNull();
  });

  it('handleCountdownComplete cria estado inicial com status running', () => {
    const { result } = renderHook(() => useActiveRun());

    act(() => {
      result.current.requestStartRun(5, 30);
    });
    act(() => {
      result.current.handleCountdownComplete();
    });

    expect(result.current.showCountdown).toBe(false);
    expect(result.current.runState).not.toBeNull();
    expect(result.current.runState.status).toBe('running');
    expect(createInitialRunState).toHaveBeenCalledWith(5, 30, 'simulation');
  });

  it('pauseRun muda status para paused', () => {
    const { result } = renderHook(() => useActiveRun());

    act(() => { result.current.requestStartRun(5, 30); });
    act(() => { result.current.handleCountdownComplete(); });

    act(() => {
      result.current.pauseRun();
    });

    expect(result.current.runState.status).toBe('paused');
  });

  it('resumeRun retorna status para running', () => {
    const { result } = renderHook(() => useActiveRun());

    act(() => { result.current.requestStartRun(5, 30); });
    act(() => { result.current.handleCountdownComplete(); });
    act(() => { result.current.pauseRun(); });

    act(() => {
      result.current.resumeRun();
    });

    expect(result.current.runState.status).toBe('running');
  });

  it('resumeRun descarta a âncora de GPS anterior e contabiliza a pausa', () => {
    createInitialRunState.mockReturnValue({
      ...mockInitialState,
      mode: 'gps',
      lastPosition: { lat: -23.5, lon: -46.6 },
      lastGpsTimestamp: 1000,
      lastMovementTs: 1000,
      gpsFixCount: 7,
      speedKmh: 11,
      currentPaceMinKm: 5.4,
      rollingPaces: [5.4, 5.5],
      pausedAccumMs: 0,
      pausedAtMs: null,
    });

    const { result } = renderHook(() => useActiveRun());
    act(() => { result.current.requestStartRun(5, 30, 'gps'); });
    act(() => { result.current.handleCountdownComplete(); });
    act(() => { result.current.pauseRun(); });

    expect(result.current.runState.pausedAtMs).not.toBeNull();

    act(() => { result.current.resumeRun(); });

    const state = result.current.runState;
    // Sem isso, o salto entre a posição antiga e a atual viraria distância.
    expect(state.lastPosition).toBeNull();
    expect(state.lastGpsTimestamp).toBeNull();
    expect(state.lastMovementTs).toBeNull();
    expect(state.gpsFixCount).toBe(0);
    expect(state.speedKmh).toBe(0);
    expect(state.currentPaceMinKm).toBe(0);
    expect(state.rollingPaces).toEqual([]);
    expect(state.isStationary).toBe(true);
    expect(state.pausedAtMs).toBeNull();
    expect(state.pausedAccumMs).toBeGreaterThanOrEqual(0);
  });

  it('toggleSpeedMultiplier cicla entre [1,2,3,5,10]', () => {
    const { result } = renderHook(() => useActiveRun());

    act(() => { result.current.requestStartRun(5, 30); });
    act(() => { result.current.handleCountdownComplete(); });

    expect(result.current.runState.speedMultiplier).toBe(1);

    const expectedSequence = [2, 3, 5, 10, 1];
    for (const expected of expectedSequence) {
      act(() => { result.current.toggleSpeedMultiplier(); });
      expect(result.current.runState.speedMultiplier).toBe(expected);
    }
  });

  it('resetRun limpa estado e contagem regressiva', () => {
    const { result } = renderHook(() => useActiveRun());

    act(() => { result.current.requestStartRun(5, 30); });
    act(() => { result.current.handleCountdownComplete(); });

    act(() => {
      result.current.resetRun();
    });

    expect(result.current.runState).toBeNull();
    expect(result.current.showCountdown).toBe(false);
  });

  it('finishRun chama callback de conclusão com status completed', () => {
    const onRunCompleted = vi.fn();
    const { result } = renderHook(() => useActiveRun(onRunCompleted));

    act(() => { result.current.requestStartRun(5, 30); });
    act(() => { result.current.handleCountdownComplete(); });

    act(() => {
      result.current.finishRun();
    });

    expect(onRunCompleted).toHaveBeenCalledTimes(1);
    const completedState = onRunCompleted.mock.calls[0][0];
    expect(completedState.status).toBe('completed');
    expect(completedState.progressPercent).toBe(100);
    expect(result.current.runState.status).toBe('completed');
    expect(result.current.runState.progressPercent).toBe(100);
  });

  it('toggleSpeedMultiplier retorna null quando runState é null', () => {
    const { result } = renderHook(() => useActiveRun());

    expect(result.current.runState).toBeNull();

    act(() => {
      result.current.toggleSpeedMultiplier();
    });

    expect(result.current.runState).toBeNull();
  });
});
