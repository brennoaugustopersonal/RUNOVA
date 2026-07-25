import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createInitialRunState,
  tickRunSimulation,
  tickGpsRun,
  processGpsUpdate,
} from '../services/runEngine';
import { soundService } from '../services/soundService';
import { voiceService } from '../services/voiceService';
import { triggerHaptic } from '../services/hapticService';
import { bluetoothHrService } from '../services/bluetoothHrService';
import {
  saveActiveRunSnapshot,
  loadActiveRunSnapshot,
  clearActiveRunSnapshot,
} from '../services/storageService';
import type { ActiveRunSnapshot, RunMode, RunState } from '../types/domain';

const SPEED_OPTIONS = [1, 2, 3, 5, 10];
const SNAPSHOT_INTERVAL_MS = 5000;
const MAX_GPS_ACCURACY_M = 50;
const MAX_CATCHUP_SECONDS = 30;
const PACE_ALERT_INTERVAL_MS = 120000;

type RunCompletedHandler = (state: RunState) => void;

export interface UseActiveRunResult {
  runState: RunState | null;
  showCountdown: boolean;
  resumeAvailable: ActiveRunSnapshot | null;
  requestStartRun: (
    targetDistanceKm: number,
    targetDurationMinutes: number,
    mode?: RunMode
  ) => void;
  handleCountdownComplete: () => void;
  resumeInterruptedRun: () => void;
  discardInterruptedRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  toggleSpeedMultiplier: () => void;
  finishRun: () => void;
  resetRun: () => void;
  connectBluetoothHr: () => Promise<boolean>;
  disconnectBluetoothHr: () => Promise<void>;
}

export function useActiveRun(onRunCompleted?: RunCompletedHandler): UseActiveRunResult {
  const [runState, setRunState] = useState<RunState | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState<ActiveRunSnapshot | null>(null);

  const pendingConfigRef = useRef<{
    targetDistanceKm: number;
    targetDurationMinutes: number;
    mode: RunMode;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchGpsRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onRunCompletedRef = useRef(onRunCompleted);
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSplitCountRef = useRef(0);
  const gpsSignalStateRef = useRef<'ok' | 'degraded'>('ok');
  const runStateRef = useRef<RunState | null>(runState);
  const lastTickTsRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const snapshotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPaceAlertRef = useRef(0);

  onRunCompletedRef.current = onRunCompleted;
  runStateRef.current = runState;

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }
    } catch {
      // sentinel já pode ter sido liberado pelo sistema
    } finally {
      wakeLockRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      if (navigator.wakeLock && !wakeLockRef.current) {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // Wake Lock pode falhar em navegadores sem suporte ou com bateria baixa
    }
  }, []);

  // Restaura corrida incompleta após queda ou recarregamento
  useEffect(() => {
    const snap = loadActiveRunSnapshot();
    if (
      snap?.runState &&
      (snap.runState.status === 'running' || snap.runState.status === 'paused')
    ) {
      setResumeAvailable(snap);
    }
  }, []);

  useEffect(
    () => () => {
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
      if (snapshotTimerRef.current) clearInterval(snapshotTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      void releaseWakeLock();
    },
    [releaseWakeLock]
  );

  // Reobtém o wake lock ao voltar para a aba e ressincroniza o relógio
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (runStateRef.current?.status === 'running') {
          void requestWakeLock();
          lastTickTsRef.current = performance.now();
        }
      } else if (runStateRef.current) {
        // Salva imediatamente ao sair — celular pode encerrar a aba a qualquer momento
        saveActiveRunSnapshot(runStateRef.current);
      }
    };
    const onPageHide = () => {
      if (runStateRef.current) saveActiveRunSnapshot(runStateRef.current);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [requestWakeLock]);

  // Confirma antes de sair durante uma corrida ativa
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const status = runStateRef.current?.status;
      if (status === 'running' || status === 'paused') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Persiste periodicamente a corrida em andamento
  const runStatus = runState?.status;
  useEffect(() => {
    const isActive = runStatus === 'running' || runStatus === 'paused';
    if (!isActive) return undefined;

    if (runStateRef.current) saveActiveRunSnapshot(runStateRef.current);
    snapshotTimerRef.current = setInterval(() => {
      if (runStateRef.current) saveActiveRunSnapshot(runStateRef.current);
    }, SNAPSHOT_INTERVAL_MS);

    return () => {
      if (snapshotTimerRef.current) {
        clearInterval(snapshotTimerRef.current);
        snapshotTimerRef.current = null;
      }
    };
  }, [runStatus]);

  const requestStartRun = useCallback(
    (targetDistanceKm: number, targetDurationMinutes: number, mode: RunMode = 'simulation') => {
      pendingConfigRef.current = { targetDistanceKm, targetDurationMinutes, mode };
      setShowCountdown(true);
    },
    []
  );

  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false);
    if (!pendingConfigRef.current) return;
    const { targetDistanceKm, targetDurationMinutes, mode } = pendingConfigRef.current;

    completedRef.current = false;
    prevSplitCountRef.current = 0;
    gpsSignalStateRef.current = 'ok';
    lastPaceAlertRef.current = Date.now();
    lastTickTsRef.current = performance.now();

    soundService.playStartSound();
    voiceService.speakStart();
    triggerHaptic('success');

    const initialState = createInitialRunState(targetDistanceKm, targetDurationMinutes, mode);
    initialState.status = 'running';
    initialState.startedAt = Date.now();
    setRunState(initialState);
    setResumeAvailable(null);
    void requestWakeLock();
  }, [requestWakeLock]);

  const resumeInterruptedRun = useCallback(() => {
    if (!resumeAvailable?.runState) return;
    completedRef.current = false;
    prevSplitCountRef.current = resumeAvailable.runState.splits?.length || 0;
    gpsSignalStateRef.current = 'ok';
    lastTickTsRef.current = performance.now();

    setRunState({
      ...resumeAvailable.runState,
      status: 'paused', // retoma pausada para o usuário decidir quando continuar
      gpsDegraded: false,
    });
    setResumeAvailable(null);
    voiceService.speak('Corrida restaurada. Toque em continuar quando estiver pronto.');
    triggerHaptic('medium');
  }, [resumeAvailable]);

  const discardInterruptedRun = useCallback(() => {
    clearActiveRunSnapshot();
    setResumeAvailable(null);
  }, []);

  const pauseRun = useCallback(() => {
    soundService.playPauseSound();
    voiceService.speakPause();
    triggerHaptic('medium');
    lastTickTsRef.current = null;
    void releaseWakeLock();
    setRunState((prev) => (prev && prev.status !== 'paused' ? { ...prev, status: 'paused' } : prev));
  }, [releaseWakeLock]);

  const resumeRun = useCallback(() => {
    soundService.playStartSound();
    voiceService.speakResume();
    triggerHaptic('medium');
    lastTickTsRef.current = performance.now();
    void requestWakeLock();
    setRunState((prev) =>
      prev && prev.status !== 'running' ? { ...prev, status: 'running' } : prev
    );
  }, [requestWakeLock]);

  const toggleSpeedMultiplier = useCallback(() => {
    triggerHaptic('light');
    setRunState((prev) => {
      if (!prev) return null;
      const idx = SPEED_OPTIONS.indexOf(prev.speedMultiplier);
      return { ...prev, speedMultiplier: SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length] };
    });
  }, []);

  const completeRun = useCallback(
    (stateToSave: RunState | null) => {
      if (completedRef.current || !stateToSave) return;
      completedRef.current = true;
      clearActiveRunSnapshot();
      void releaseWakeLock();
      soundService.playCelebrationSound();
      voiceService.speakFinish(stateToSave.currentDistanceKm ?? 0);
      triggerHaptic('heavy');

      const completedState: RunState = {
        ...stateToSave,
        status: 'completed',
        progressPercent: 100,
      };
      onRunCompletedRef.current?.(completedState);
      setRunState(completedState);
    },
    [releaseWakeLock]
  );

  const finishRun = useCallback(() => {
    if (completedRef.current) return;
    completeRun(runStateRef.current);
  }, [completeRun]);

  const resetRun = useCallback(() => {
    completedRef.current = false;
    prevSplitCountRef.current = 0;
    gpsSignalStateRef.current = 'ok';
    lastTickTsRef.current = null;
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
    clearActiveRunSnapshot();
    void releaseWakeLock();
    setRunState(null);
    setShowCountdown(false);
  }, [releaseWakeLock]);

  const connectBluetoothHr = useCallback(async () => {
    if (!bluetoothHrService.isSupported()) {
      throw new Error('Bluetooth não suportado');
    }
    await bluetoothHrService.requestDevice();
    bluetoothHrService.onHeartRate = (hr: number) => {
      setRunState((prev) => (prev ? { ...prev, heartRateBpm: hr, bluetoothHrConnected: true } : prev));
    };
    bluetoothHrService.onDisconnect = () => {
      setRunState((prev) => (prev ? { ...prev, bluetoothHrConnected: false } : prev));
    };
    await bluetoothHrService.connect();
    return true;
  }, []);

  const disconnectBluetoothHr = useCallback(async () => {
    await bluetoothHrService.disconnect();
    setRunState((prev) => (prev ? { ...prev, bluetoothHrConnected: false } : prev));
  }, []);

  // Observador de GPS — ativo apenas quando o modo é explicitamente 'gps'
  const runMode = runState?.mode;
  useEffect(() => {
    if (runStatus !== 'running' || runMode !== 'gps' || !('geolocation' in navigator)) {
      return undefined;
    }

    watchGpsRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;

        if (accuracy != null && accuracy > MAX_GPS_ACCURACY_M) {
          setRunState((prev) => {
            if (!prev || prev.status !== 'running' || prev.mode !== 'gps') return prev;
            return { ...prev, gpsAccuracy: Math.round(accuracy), gpsDegraded: true };
          });
          return;
        }

        setRunState((prev) => {
          if (!prev || prev.status !== 'running' || prev.mode !== 'gps') return prev;
          const updated = processGpsUpdate(prev, latitude, longitude, accuracy, pos.timestamp);
          return updated ? { ...updated, gpsDegraded: false } : prev;
        });
      },
      () => {
        // Mantém o modo GPS — apenas sinaliza degradação, nunca cai para simulação
        setRunState((prev) => (prev?.mode === 'gps' ? { ...prev, gpsDegraded: true } : prev));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
    );

    return () => {
      if (watchGpsRef.current != null) {
        navigator.geolocation.clearWatch(watchGpsRef.current);
        watchGpsRef.current = null;
      }
    };
  }, [runStatus, runMode]);

  // Timer baseado em relógio real — resistente ao throttling em segundo plano
  useEffect(() => {
    if (runStatus !== 'running') {
      lastTickTsRef.current = null;
      return undefined;
    }

    lastTickTsRef.current = performance.now();
    timerRef.current = setInterval(() => {
      setRunState((prev) => {
        if (!prev || prev.status !== 'running') return prev;
        const now = performance.now();
        const last = lastTickTsRef.current ?? now;
        let deltaSec = (now - last) / 1000;
        lastTickTsRef.current = now;

        // Aba suspensa pode produzir saltos enormes — limita a recuperação
        if (!Number.isFinite(deltaSec) || deltaSec < 0) deltaSec = 1;
        if (deltaSec > MAX_CATCHUP_SECONDS) deltaSec = MAX_CATCHUP_SECONDS;

        return prev.mode === 'gps' ? tickGpsRun(prev, deltaSec) : tickRunSimulation(prev, deltaSec);
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [runStatus]);

  // Conclusão automática quando o motor marca a corrida como completa
  useEffect(() => {
    if (runStatus !== 'completed' || completedRef.current) return undefined;
    completeTimeoutRef.current = setTimeout(() => {
      completeRun(runStateRef.current);
    }, 100);
    return () => {
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
        completeTimeoutRef.current = null;
      }
    };
  }, [runStatus, completeRun]);

  // Anúncio de voz a cada quilômetro completado
  const splitCount = runState?.splits?.length ?? 0;
  useEffect(() => {
    if (runStatus !== 'running') return;
    const splits = runStateRef.current?.splits;
    if (!splits || splitCount <= prevSplitCountRef.current || splitCount === 0) {
      prevSplitCountRef.current = splitCount;
      return;
    }
    const lastSplit = splits[splitCount - 1];
    soundService.playSplitSound?.();
    voiceService.speakKmSplit(lastSplit.km, lastSplit.paceMinKm);
    triggerHaptic('medium');
    prevSplitCountRef.current = splitCount;
  }, [splitCount, runStatus]);

  // Aviso de degradação/recuperação do sinal de GPS
  const gpsDegraded = runState?.gpsDegraded ?? false;
  useEffect(() => {
    if (runStatus !== 'running' || runMode !== 'gps') return;
    if (gpsDegraded && gpsSignalStateRef.current !== 'degraded') {
      gpsSignalStateRef.current = 'degraded';
      voiceService.speak('Sinal GPS fraco. Continuando com precisão reduzida.');
    } else if (!gpsDegraded && gpsSignalStateRef.current === 'degraded') {
      gpsSignalStateRef.current = 'ok';
      voiceService.speak('Sinal GPS recuperado.');
    }
  }, [gpsDegraded, runMode, runStatus]);

  // Coach de ritmo: alerta no máximo a cada 2 minutos quando desvia do alvo
  const currentPace = runState?.currentPaceMinKm ?? 0;
  const targetPace = runState?.targetPaceMinKm ?? 0;
  const elapsed = runState?.elapsedSeconds ?? 0;
  useEffect(() => {
    if (runStatus !== 'running' || elapsed < 60 || !currentPace || !targetPace) return;
    const now = Date.now();
    if (now - lastPaceAlertRef.current < PACE_ALERT_INTERVAL_MS) return;
    if (Math.abs(currentPace - targetPace) * 60 < 25) return;
    lastPaceAlertRef.current = now;
    voiceService.speakPaceAlert?.(currentPace, targetPace);
  }, [currentPace, targetPace, elapsed, runStatus]);

  return {
    runState,
    showCountdown,
    resumeAvailable,
    requestStartRun,
    handleCountdownComplete,
    resumeInterruptedRun,
    discardInterruptedRun,
    pauseRun,
    resumeRun,
    toggleSpeedMultiplier,
    finishRun,
    resetRun,
    connectBluetoothHr,
    disconnectBluetoothHr,
  };
}
