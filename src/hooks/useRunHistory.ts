import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getStoredRuns,
  saveRunWithResult,
  deleteRun as deleteRunFromStorage,
  updateRun as updateRunInStorage,
  importRuns,
  clearStoredRuns,
} from '../services/storageService';
import { computeStats } from '../services/statsService';
import { fetchElevationGain } from '../services/elevationService';
import { reverseGeocode } from '../services/weatherService';
import type { RunRecord, RunState, RunStats } from '../types/domain';

export interface UseRunHistoryResult {
  runs: RunRecord[];
  stats: RunStats;
  addRun: (activeRunState: RunState) => RunRecord;
  deleteRun: (runId: string) => void;
  importHistory: (incoming: RunRecord[]) => void;
  clearHistory: () => void;
  storageError: string | null;
  dismissStorageError: () => void;
}

export function useRunHistory(): UseRunHistoryResult {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setRuns(getStoredRuns());
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const addRun = useCallback((activeRunState: RunState): RunRecord => {
    const runData = {
      distanceKm: activeRunState.currentDistanceKm,
      targetDistanceKm: activeRunState.targetDistanceKm,
      durationSeconds: Math.round(activeRunState.elapsedSeconds),
      targetDurationSeconds: activeRunState.targetDurationSeconds,
      paceMinKm: activeRunState.avgPaceMinKm,
      targetPaceMinKm: activeRunState.targetPaceMinKm,
      speedKmh: activeRunState.speedKmh,
      calories: activeRunState.calories,
      completedGoal: activeRunState.currentDistanceKm >= activeRunState.targetDistanceKm,
      routePoints: activeRunState.routePoints || [],
      splits: activeRunState.splits || [],
      heartRateHistory: activeRunState.heartRateHistory || [],
      mode: activeRunState.mode || 'simulation',
      speedMultiplier: activeRunState.speedMultiplier || 1,
      elevationGainM: activeRunState.elevationGainM || 0,
    };

    const result = saveRunWithResult(runData);
    setRuns(result.runs.length > 0 ? result.runs : [result.run]);

    if (!result.ok) {
      setStorageError(
        'Não foi possível salvar no armazenamento local. Libere espaço ou exporte seu histórico.'
      );
    } else if (result.warning === 'storage_trimmed') {
      setStorageError('Espaço quase cheio — rotas antigas foram reduzidas para liberar memória.');
    }

    // Enriquecimento em segundo plano com APIs gratuitas (elevação + local).
    const saved = result.run;
    if (result.ok && saved && runData.mode === 'gps' && runData.routePoints.length >= 2) {
      void (async () => {
        try {
          const [firstLat, firstLon] = runData.routePoints[0];
          const [gain, geo] = await Promise.all([
            runData.elevationGainM > 0
              ? Promise.resolve(runData.elevationGainM)
              : fetchElevationGain(runData.routePoints),
            firstLat != null ? reverseGeocode(firstLat, firstLon) : Promise.resolve(null),
          ]);

          if (!mountedRef.current) return;
          if (gain > 0 || geo?.label) {
            const updated = updateRunInStorage(saved.id, {
              ...(gain > 0 ? { elevationGainM: gain } : {}),
              ...(geo?.label ? { locationLabel: geo.label } : {}),
            });
            setRuns(updated);
          }
        } catch {
          // enriquecimento é best-effort — nunca compromete a corrida salva
        }
      })();
    }

    return saved;
  }, []);

  const deleteRun = useCallback((runId: string) => {
    setRuns(deleteRunFromStorage(runId));
  }, []);

  const importHistory = useCallback((incoming: RunRecord[]) => {
    setRuns(importRuns(incoming));
  }, []);

  const clearHistory = useCallback(() => {
    setRuns(clearStoredRuns());
  }, []);

  const dismissStorageError = useCallback(() => setStorageError(null), []);

  const stats = useMemo(() => computeStats(runs), [runs]);

  return {
    runs,
    stats,
    addRun,
    deleteRun,
    importHistory,
    clearHistory,
    storageError,
    dismissStorageError,
  };
}
