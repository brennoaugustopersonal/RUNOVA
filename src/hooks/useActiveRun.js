import { useState, useEffect, useCallback, useRef } from 'react';
import { createInitialRunState, tickRunSimulation } from '../services/runSimulator';
import { calculateHaversineDistance } from '../utils/calculations';
import { soundService } from '../services/soundService';
import { voiceService } from '../services/voiceService';
import { triggerHaptic } from '../services/hapticService';

export function useActiveRun(onRunCompleted) {
  const [runState, setRunState] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const pendingConfigRef = useRef(null);

  const timerRef = useRef(null);
  const watchGpsRef = useRef(null);
  const completedRef = useRef(false);

  // Solicita início e exibe contagem regressiva 3... 2... 1...
  const requestStartRun = useCallback((targetDistanceKm, targetDurationMinutes, mode = 'simulation') => {
    pendingConfigRef.current = { targetDistanceKm, targetDurationMinutes, mode };
    setShowCountdown(true);
  }, []);

  // Inicia a corrida após a contagem regressiva
  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    if (!pendingConfigRef.current) return;

    const { targetDistanceKm, targetDurationMinutes, mode } = pendingConfigRef.current;
    completedRef.current = false;
    soundService.playStartSound();
    voiceService.speakStart();
    triggerHaptic('success');

    const initialState = createInitialRunState(targetDistanceKm, targetDurationMinutes, mode);
    initialState.status = 'running';
    setRunState(initialState);
  }, []);

  // Pausa a corrida
  const pauseRun = useCallback(() => {
    soundService.playPauseSound();
    voiceService.speakPause();
    triggerHaptic('medium');
    setRunState((prev) => (prev ? { ...prev, status: 'paused' } : null));
  }, []);

  // Retoma a corrida
  const resumeRun = useCallback(() => {
    soundService.playStartSound();
    voiceService.speakResume();
    triggerHaptic('medium');
    setRunState((prev) => (prev ? { ...prev, status: 'running' } : null));
  }, []);

  // Alterna o multiplicador de velocidade (1x, 5x, 10x)
  const toggleSpeedMultiplier = useCallback(() => {
    triggerHaptic('light');
    setRunState((prev) => {
      if (!prev) return null;
      const nextMultiplier = prev.speedMultiplier === 1 ? 5 : prev.speedMultiplier === 5 ? 10 : 1;
      return { ...prev, speedMultiplier: nextMultiplier };
    });
  }, []);

  // Finaliza a corrida
  const finishRun = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    soundService.playCelebrationSound();
    triggerHaptic('heavy');
    setRunState((prev) => {
      if (!prev) return null;
      voiceService.speakFinish(prev.currentDistanceKm);
      const completedState = { ...prev, status: 'completed', progressPercent: 100 };
      if (onRunCompleted) {
        onRunCompleted(completedState);
      }
      return completedState;
    });
  }, [onRunCompleted]);

  // Cancela a corrida
  const resetRun = useCallback(() => {
    completedRef.current = false;
    setRunState(null);
    setShowCountdown(false);
  }, []);

  // Loop de GPS Real
  useEffect(() => {
    if (runState?.status === 'running' && runState?.mode === 'gps' && 'geolocation' in navigator) {
      watchGpsRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;

          setRunState((prev) => {
            if (!prev || prev.status !== 'running') return prev;

            let addedKm = 0;
            if (prev.lastPosition) {
              addedKm = calculateHaversineDistance(
                prev.lastPosition.lat,
                prev.lastPosition.lon,
                latitude,
                longitude
              );
              if (addedKm > 1) addedKm = 0;
            }

            const newDistanceKm = Math.min(prev.targetDistanceKm, prev.currentDistanceKm + addedKm);
            const isCompleted = newDistanceKm >= prev.targetDistanceKm;
            const newRoutePoints = [...prev.routePoints, [latitude, longitude]];

            if (isCompleted && prev.status !== 'completed' && !completedRef.current) {
              completedRef.current = true;
              soundService.playCelebrationSound();
              voiceService.speakFinish(newDistanceKm);
            }

            return {
              ...prev,
              currentDistanceKm: newDistanceKm,
              gpsAccuracy: Math.round(accuracy),
              lastPosition: { lat: latitude, lon: longitude },
              routePoints: newRoutePoints,
              status: isCompleted ? 'completed' : 'running',
            };
          });
        },
        () => {
          setRunState((prev) => (prev ? { ...prev, mode: 'simulation' } : null));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
      );
    } else {
      if (watchGpsRef.current) {
        navigator.geolocation.clearWatch(watchGpsRef.current);
        watchGpsRef.current = null;
      }
    }

    return () => {
      if (watchGpsRef.current) {
        navigator.geolocation.clearWatch(watchGpsRef.current);
      }
    };
  }, [runState?.status, runState?.mode]);

  // Motor de Tick
  useEffect(() => {
    if (runState?.status === 'running') {
      timerRef.current = setInterval(() => {
        setRunState((prev) => {
          if (!prev || prev.status !== 'running') return prev;
          const nextState = tickRunSimulation(prev, 1);

          // Anúncio de voz ao completar cada quilômetro
          if (nextState.splits.length > prev.splits.length) {
            const lastSplit = nextState.splits[nextState.splits.length - 1];
            voiceService.speakKmSplit(lastSplit.km, lastSplit.paceMinKm);
            triggerHaptic('medium');
          }
          
          if (nextState.status === 'completed' && prev.status !== 'completed' && !completedRef.current) {
            completedRef.current = true;
            soundService.playCelebrationSound();
            voiceService.speakFinish(nextState.currentDistanceKm);
            triggerHaptic('heavy');
            if (onRunCompleted) {
              onRunCompleted(nextState);
            }
          }
          return nextState;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [runState?.status, onRunCompleted]);

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
  };
}
