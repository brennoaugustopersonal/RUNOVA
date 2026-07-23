import { calculatePace, calculateSpeed, calculateCalories } from '../utils/calculations';

/**
 * Cria o estado inicial de uma nova corrida Pro
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
    
    // Telemetria Pro (BPM & Cadência)
    heartRateBpm: 142,
    cadenceSpm: 168,
    
    // Rastreamento de Rota GPS & Splits
    routePoints: [], // [[lat, lon], ...]
    lastPosition: null,
    gpsAccuracy: null,
    splits: [], // [{ km: 1, durationSeconds: 320, paceMinKm: 5.33, isBest: false }]
    lastKmMarked: 0,
    
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

  // Variações realistas de BPM (135 a 175) e Cadência (162 a 178 SPM)
  const heartRateBpm = Math.round(135 + Math.sin(newElapsed / 10) * 15 + (speed * 2.5));
  const cadenceSpm = Math.round(165 + (speed > 10 ? 10 : 0) + Math.sin(newElapsed / 5) * 4);

  let newRoutePoints = [...state.routePoints];
  if (state.mode === 'simulation') {
    const angle = (newElapsed / 180) * Math.PI;
    const centerLat = -23.5874;
    const centerLon = -46.6576;
    const radius = 0.003 * (newDistanceKm + 0.1);
    const simLat = centerLat + Math.cos(angle) * radius;
    const simLon = centerLon + Math.sin(angle) * radius;
    const lastPoint = newRoutePoints[newRoutePoints.length - 1];
    const shouldAdd = !lastPoint || (
      Math.abs(simLat - lastPoint[0]) > 0.00005 ||
      Math.abs(simLon - lastPoint[1]) > 0.00005
    );
    if (newRoutePoints.length === 0 || shouldAdd) {
      newRoutePoints.push([simLat, simLon]);
    }
  }

  // Verificação de Splits por Km
  const currentKmMark = Math.floor(newDistanceKm);
  let newSplits = [...state.splits];
  let lastKmMarked = state.lastKmMarked;

  if (currentKmMark > lastKmMarked && currentKmMark > 0) {
    const prevKmTime = newSplits.reduce((acc, s) => acc + s.durationSeconds, 0);
    const splitDuration = newElapsed - prevKmTime;
    const splitPace = calculatePace(1, splitDuration);

    newSplits.push({
      km: currentKmMark,
      durationSeconds: splitDuration,
      paceMinKm: splitPace,
      isBest: false,
    });

    // Identifica o melhor split
    const minSplitPace = Math.min(...newSplits.map((s) => s.paceMinKm));
    newSplits = newSplits.map((s) => ({ ...s, isBest: s.paceMinKm === minSplitPace }));

    lastKmMarked = currentKmMark;
  }

  return {
    ...state,
    elapsedSeconds: newElapsed,
    currentDistanceKm: newDistanceKm,
    currentPaceMinKm: currentPace,
    avgPaceMinKm: avgPace > 0 ? avgPace : basePace,
    speedKmh: speed,
    calories,
    progressPercent,
    heartRateBpm,
    cadenceSpm,
    routePoints: newRoutePoints,
    splits: newSplits,
    lastKmMarked,
    status: isCompleted ? 'completed' : 'running',
  };
}
