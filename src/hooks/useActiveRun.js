import { useState, useEffect, useCallback, useRef } from 'react';
import { createInitialRunState, tickRunSimulation, tickGpsRun, processGpsUpdate } from '../services/runEngine';
import { soundService } from '../services/soundService';
import { voiceService } from '../services/voiceService';
import { triggerHaptic } from '../services/hapticService';
import { bluetoothHrService } from '../services/bluetoothHrService';

const SPEED_OPTIONS = [1, 2, 3, 5, 10];

export function useActiveRun(onRunCompleted) {
  const [runState, setRunState] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);

  const pendingConfigRef = useRef(null);
  const timerRef = useRef(null);
  const watchGpsRef = useRef(null);
  const completedRef = useRef(false);
  const onRunCompletedRef = useRef(onRunCompleted);
  const completeTimeoutRef = useRef(null);
  const prevSplitCountRef = useRef(0);
  const prevModeRef = useRef(null);
  onRunCompletedRef.current = onRunCompleted;

  useEffect(() => {
    return () => {
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
    };
  }, []);

  const requestStartRun = useCallback((targetDistanceKm, targetDurationMinutes, mode = 'simulation') => {
    pendingConfigRef.current = { targetDistanceKm, targetDurationMinutes, mode };
    setShowCountdown(true);
  }, []);

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    if (!pendingConfigRef.current) return;
    const { targetDistanceKm, targetDurationMinutes, mode } = pendingConfigRef.current;
    completedRef.current = false;
    prevSplitCountRef.current = 0;
    prevModeRef.current = null;
    soundService.playStartSound();
    voiceService.speakStart();
    triggerHaptic('success');
    const initialState = createInitialRunState(targetDistanceKm, targetDurationMinutes, mode);
    initialState.status = 'running';
    setRunState(initialState);
  }, []);

  const pauseRun = useCallback(() => {
    soundService.playPauseSound();
    voiceService.speakPause();
    triggerHaptic('medium');
    setRunState((prev) => (prev && prev.status !== 'paused' ? { ...prev, status: 'paused' } : prev));
  }, []);

  const resumeRun = useCallback(() => {
    soundService.playStartSound();
    voiceService.speakResume();
    triggerHaptic('medium');
    setRunState((prev) => (prev && prev.status !== 'running' ? { ...prev, status: 'running' } : prev));
  }, []);

  const toggleSpeedMultiplier = useCallback(() => {
    triggerHaptic('light');
    setRunState((prev) => {
      if (!prev) return null;
      const idx = SPEED_OPTIONS.indexOf(prev.speedMultiplier);
      const nextMultiplier = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
      return { ...prev, speedMultiplier: nextMultiplier };
    });
  }, []);

  const completeRun = useCallback((stateToSave) => {
    if (completedRef.current) return;
    completedRef.current = true;
    soundService.playCelebrationSound();
    voiceService.speakFinish(stateToSave.currentDistanceKm);
    triggerHaptic('heavy');
    const completedState = { ...stateToSave, status: 'completed', progressPercent: 100 };
    if (onRunCompletedRef.current) {
      onRunCompletedRef.current(completedState);
    }
    setRunState(completedState);
  }, []);

  const finishRun = useCallback(() => {
    if (completedRef.current) return;
    completeRun(runState);
  }, [completeRun, runState]);

  const resetRun = useCallback(() => {
    completedRef.current = false;
    prevSplitCountRef.current = 0;
    prevModeRef.current = null;
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
    setRunState(null);
    setShowCountdown(false);
  }, []);

  const connectBluetoothHr = useCallback(async () => {
    if (!bluetoothHrService.isSupported()) {
      throw new Error('Bluetooth não suportado');
    }
    await bluetoothHrService.requestDevice();
    bluetoothHrService.onHeartRate = (hr) => {
      setRunState((prev) => {
        if (!prev) return null;
        return { ...prev, heartRateBpm: hr, bluetoothHrConnected: true };
      });
    };
    await bluetoothHrService.connect();
    return true;
  }, []);

  const disconnectBluetoothHr = useCallback(async () => {
    await bluetoothHrService.disconnect();
  }, []);

  useEffect(() => {
    const isRunning = runState?.status === 'running';
    const hasGeo = 'geolocation' in navigator;

    if (isRunning && hasGeo) {
      watchGpsRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const timestamp = pos.timestamp;
          setRunState((prev) => {
            if (!prev || prev.status !== 'running') return prev;
            if (prev.mode === 'simulation') {
              return { ...prev, mode: 'gps', latitude, longitude, gpsAccuracy: accuracy };
            }
            const updated = processGpsUpdate(prev, latitude, longitude, accuracy, timestamp);
        return updated !== null ? updated : prev;
          });
        },
        () => {
          setRunState((prev) => {
            if (!prev || prev.mode === 'simulation') return prev;
            return { ...prev, mode: 'simulation' };
          });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      );
    }

    return () => {
      if (watchGpsRef.current) {
        navigator.geolocation.clearWatch(watchGpsRef.current);
        watchGpsRef.current = null;
      }
    };
  }, [runState?.status]);

  useEffect(() => {
    if (runState?.status === 'running') {
      timerRef.current = setInterval(() => {
        setRunState((prev) => {
          if (!prev || prev.status !== 'running') return prev;
          const tickFn = prev.mode === 'gps' ? tickGpsRun : tickRunSimulation;
          return tickFn(prev, 1);
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [runState?.status]);

  const runStateRef = useRef(runState);
  runStateRef.current = runState;

  useEffect(() => {
    if (!runState || runState.status !== 'completed' || completedRef.current) return;
    completeTimeoutRef.current = setTimeout(() => {
      // Usa runStateRef para evitar stale closure (runState pode estar desatualizado
      // se o estado mudar entre o trigger do efeito e a execução do timeout)
      if (runStateRef.current) {
        completeRun(runStateRef.current);
      }
    }, 100);
    return () => {
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  }, [runState?.status, completeRun]);

  useEffect(() => {
    if (!runState) return;
    if (runState.status !== 'running') return;
    const currCount = runState.splits.length;
    if (currCount > prevSplitCountRef.current && currCount > 0) {
      const lastSplit = runState.splits[currCount - 1];
      voiceService.speakKmSplit(lastSplit.km, lastSplit.paceMinKm);
      triggerHaptic('medium');
    }
    prevSplitCountRef.current = currCount;
  }, [runState?.splits?.length]);

  useEffect(() => {
    if (!runState || runState.status !== 'running') return;
    if (prevModeRef.current === 'gps' && runState.mode === 'simulation') {
      voiceService.speak('Sinal GPS perdido. Alternando para modo simulação.');
    }
    prevModeRef.current = runState.mode;
  }, [runState?.mode, runState?.status]);

  useEffect(() => {
    if (!runState || runState.status !== 'running') return;
    if (prevModeRef.current === 'simulation' && runState.mode === 'gps') {
      voiceService.speak('Sinal GPS recuperado.');
    }
  }, [runState?.mode, runState?.status]);

  return {
    runState,
    showCountdown,
    requestStartRun,
    handleCountdownComplete,
    pauseRun,
    resumeRun,
    toggleSpeedMultiplier,
    finishRun,
    resetRun,
    connectBluetoothHr,
    disconnectBluetoothHr,
  };
}
