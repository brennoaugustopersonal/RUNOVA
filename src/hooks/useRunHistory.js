import { useState, useEffect, useMemo, useCallback } from 'react';
import { getStoredRuns, saveRun as saveRunToStorage } from '../services/storageService';
import { calculatePace } from '../utils/calculations';

export function useRunHistory() {
  const [runs, setRuns] = useState([]);

  // Carrega o histórico salvo no carregamento inicial
  useEffect(() => {
    const loaded = getStoredRuns();
    setRuns(loaded);
  }, []);

  // Adiciona uma nova corrida e atualiza o estado
  const addRun = useCallback((activeRunState) => {
    const runData = {
      distanceKm: activeRunState.currentDistanceKm,
      targetDistanceKm: activeRunState.targetDistanceKm,
      durationSeconds: activeRunState.elapsedSeconds,
      targetDurationSeconds: activeRunState.targetDurationSeconds,
      paceMinKm: activeRunState.avgPaceMinKm,
      speedKmh: activeRunState.speedKmh,
      calories: activeRunState.calories,
      completedGoal: activeRunState.currentDistanceKm >= activeRunState.targetDistanceKm,
    };

    const updatedList = saveRunToStorage(runData);
    setRuns(updatedList);
    return updatedList[0]; // Retorna o item recém criado
  }, []);

  // Estatísticas acumuladas
  const stats = useMemo(() => {
    if (!runs || runs.length === 0) {
      return {
        totalDistanceKm: 0,
        totalDurationSeconds: 0,
        avgPaceMinKm: 0,
        totalRuns: 0,
        lastRun: null,
      };
    }

    const totalDistanceKm = runs.reduce((acc, run) => acc + (run.distanceKm || 0), 0);
    const totalDurationSeconds = runs.reduce((acc, run) => acc + (run.durationSeconds || 0), 0);
    const avgPaceMinKm = calculatePace(totalDistanceKm, totalDurationSeconds);

    return {
      totalDistanceKm,
      totalDurationSeconds,
      avgPaceMinKm,
      totalRuns: runs.length,
      lastRun: runs[0] || null,
    };
  }, [runs]);

  return {
    runs,
    stats,
    addRun,
  };
}
