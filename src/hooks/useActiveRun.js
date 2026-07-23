import { useState, useEffect, useCallback, useRef } from 'react';
import { createInitialRunState, tickRunSimulation } from '../services/runSimulator';
import { calculateHaversineDistance, calculatePace, calculateSpeed, calculateCalories } from '../utils/calculations';
import { soundService } from '../services/soundService';

export function useActiveRun(onRunCompleted) {
  const [runState, setRunState] = useState(null);
  const timerRef = useRef(null);
  const watchGpsRef = useRef(null);

  // Inicia uma nova corrida com os alvos e modo definidos
  const startRun = useCallback((targetDistanceKm, targetDurationMinutes, mode = 'simulation') => {
    soundService.playStartSound();
    const initialState = createInitialRunState(targetDistanceKm, targetDurationMinutes, mode);
    initialState.status = 'running';
    setRunState(initialState);
  }, []);

  // Pausa a corrida
  const pauseRun = useCallback(() => {
    soundService.playPauseSound();
    setRunState((prev) => (prev ? { ...prev, status: 'paused' } : null));
  }, []);

  // Retoma a corrida
  const resumeRun = useCallback(() => {
    soundService.playStartSound();
    setRunState((prev) => (prev ? { ...prev, status: 'running' } : null));
  }, []);

  // Alterna o multiplicador de velocidade de simulação (1x, 5x, 10x)
  const toggleSpeedMultiplier = useCallback(() => {
    setRunState((prev) => {
      if (!prev) return null;
      const nextMultiplier = prev.speedMultiplier === 1 ? 5 : prev.speedMultiplier === 5 ? 10 : 1;
      return { ...prev, speedMultiplier: nextMultiplier };
    });
  }, []);

  // Finaliza manualmente ou conclui a corrida
  const finishRun = useCallback(() => {
    soundService.playCelebrationSound();
    setRunState((prev) => {
      if (!prev) return null;
      const completedState = { ...prev, status: 'completed', progressPercent: 100 };
      if (onRunCompleted) {
        onRunCompleted(completedState);
      }
      return completedState;
    });
  }, [onRunCompleted]);

  // Cancela a corrida atual sem salvar
  const resetRun = useCallback(() => {
    setRunState(null);
  }, []);

  // Loop de Rastreamento GPS Real em Tempo Real
  useEffect(() => {
    if (runState?.status === 'running' && runState?.mode === 'gps' && 'geolocation' in navigator) {
      watchGpsRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const now = Date.now();

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
              // Filtra saltos irreais de GPS (ex: > 100 km/h)
              if (addedKm > 0.05) addedKm = 0;
            }

            const newDistanceKm = Math.min(prev.targetDistanceKm, prev.currentDistanceKm + addedKm);
            const isCompleted = newDistanceKm >= prev.targetDistanceKm;

            if (isCompleted && prev.status !== 'completed') {
              soundService.playCelebrationSound();
            }

            return {
              ...prev,
              currentDistanceKm: newDistanceKm,
              gpsAccuracy: Math.round(accuracy),
              lastPosition: { lat: latitude, lon: longitude, timestamp: now },
              status: isCompleted ? 'completed' : 'running',
            };
          });
        },
        (err) => {
          // Se o GPS falhar, alterna silenciosamente para modo simulação
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

  // Motor de Tick (loop de 1 segundo)
  useEffect(() => {
    if (runState?.status === 'running') {
      timerRef.current = setInterval(() => {
        setRunState((prev) => {
          if (!prev || prev.status !== 'running') return prev;
          const nextState = tickRunSimulation(prev, 1);
          
          if (nextState.status === 'completed' && prev.status !== 'completed') {
            soundService.playCelebrationSound();
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
    startRun,
    pauseRun,
    resumeRun,
    toggleSpeedMultiplier,
    finishRun,
    resetRun,
  };
}
