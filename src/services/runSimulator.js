import { calculatePace, calculateSpeed, calculateCalories } from '../utils/calculations';

/**
 * Cria o estado inicial de uma nova corrida
 */
export function createInitialRunState(targetDistanceKm = 2.1, targetDurationMinutes = 12, mode = 'simulation') {
  const targetDurationSeconds = Math.max(60, targetDurationMinutes * 60);
  const targetPace = targetDurationMinutes / targetDistanceKm;

  return {
    targetDistanceKm: Number(targetDistanceKm),
    targetDurationSeconds: Number(targetDurationSeconds),
    targetPaceMinKm: targetPace,
    mode, // 'simulation' | 'gps'
    
    // Telemetria em tempo real
    elapsedSeconds: 0,
    currentDistanceKm: 0,
    currentPaceMinKm: targetPace,
    avgPaceMinKm: targetPace,
    speedKmh: 0,
    calories: 0,
    progressPercent: 0,
    
    // Rastreamento GPS
    lastPosition: null, // { lat, lon, timestamp }
    gpsAccuracy: null,
    
    // Controle de execução
    status: 'idle', // 'idle' | 'running' | 'paused' | 'completed'
    speedMultiplier: 1,
  };
}

/**
 * Atualiza a telemetria a cada ciclo da simulação
 */
export function tickRunSimulation(state, deltaSeconds = 1) {
  if (state.status !== 'running') {
    return state;
  }

  const effectiveDelta = deltaSeconds * (state.speedMultiplier || 1);
  const newElapsed = state.elapsedSeconds + effectiveDelta;

  const basePace = state.targetPaceMinKm || 5.7;

  // Se o modo for simulação, adiciona variações de passada
  let newDistanceKm = state.currentDistanceKm;
  let currentPace = state.currentPaceMinKm;

  if (state.mode === 'simulation') {
    const paceNoise = (Math.sin(newElapsed / 8) * 0.15) + (Math.random() * 0.08 - 0.04);
    currentPace = Math.max(3.0, basePace + paceNoise);
    const deltaMinutes = effectiveDelta / 60;
    const addedDistanceKm = deltaMinutes / currentPace;
    newDistanceKm += addedDistanceKm;
  }

  let isCompleted = false;
  if (newDistanceKm >= state.targetDistanceKm) {
    newDistanceKm = state.targetDistanceKm;
    isCompleted = true;
  }

  const avgPace = calculatePace(newDistanceKm, newElapsed);
  const speed = calculateSpeed(newDistanceKm, newElapsed);
  const calories = calculateCalories(newDistanceKm, newElapsed);
  const progressPercent = Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100);

  return {
    ...state,
    elapsedSeconds: newElapsed,
    currentDistanceKm: newDistanceKm,
    currentPaceMinKm: currentPace,
    avgPaceMinKm: avgPace > 0 ? avgPace : basePace,
    speedKmh: speed,
    calories,
    progressPercent,
    status: isCompleted ? 'completed' : 'running',
  };
}
