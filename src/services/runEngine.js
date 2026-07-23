import { calculatePace, calculateSpeed, calculateCalories, calculateHaversineDistance } from '../utils/calculations';
import { estimateHeartRate, estimateCadence, smoothRollingPaces, calculateInstantPaceFromSpeed } from './physioEstimation';

/**
 * Função compartilhada para calcular e marcar splits por km.
 * Evita duplicação entre tickRunSimulation, tickGpsRun e processGpsUpdate.
 */
function computeSplits(newDistanceKm, currentDistanceKm, newElapsed, existingSplits, existingLastKmMarked) {
  let newSplits = [...existingSplits];
  let lastKmMarked = existingLastKmMarked;
  const prevKmCount = Math.floor(currentDistanceKm);
  const currentKmMark = Math.floor(newDistanceKm);

  for (let km = prevKmCount + 1; km <= currentKmMark; km++) {
    const prevKmTime = newSplits.reduce((acc, s) => acc + s.durationSeconds, 0);
    const splitDuration = newElapsed - prevKmTime;
    const splitPace = calculatePace(1, splitDuration);

    newSplits.push({
      km,
      durationSeconds: Math.round(splitDuration),
      paceMinKm: splitPace,
      isBest: false,
    });
    lastKmMarked = km;
  }

  if (newSplits.length > existingSplits.length) {
    const minSplitPace = Math.min(...newSplits.map((s) => s.paceMinKm));
    newSplits = newSplits.map((s) => ({ ...s, isBest: s.paceMinKm === minSplitPace }));
  }

  return { newSplits, lastKmMarked };
}

export function createInitialRunState(targetDistanceKm = 2.1, targetDurationMinutes = 12, mode = 'simulation') {
  const targetDurationSeconds = Math.max(60, targetDurationMinutes * 60);
  const targetPace = targetDurationMinutes / targetDistanceKm;

  return {
    targetDistanceKm: Number(targetDistanceKm),
    targetDurationSeconds: Number(targetDurationSeconds),
    targetPaceMinKm: targetPace,
    mode,

    elapsedSeconds: 0,
    currentDistanceKm: 0,
    currentPaceMinKm: targetPace,
    avgPaceMinKm: targetPace,
    speedKmh: 0,
    calories: 0,
    progressPercent: 0,

    heartRateBpm: estimateHeartRate(0, 0),
    cadenceSpm: estimateCadence(0),

    routePoints: [],
    lastPosition: null,
    gpsAccuracy: null,
    splits: [],
    lastKmMarked: 0,

    status: 'idle',
    speedMultiplier: 1,

    rollingPaces: [],
    heartRateHistory: [], // [ { time: elapsedSeconds, bpm: number }, ... ] a cada 5s
    bluetoothHrConnected: false,
    lastGpsTimestamp: null,
  };
}

export function tickRunSimulation(state, deltaSeconds = 1) {
  if (state.status !== 'running') return state;

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

  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(speed || state.speedKmh, newElapsed / 60);
  const cadenceSpm = estimateCadence(speed || state.speedKmh);

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

  let newSplits = [...state.splits];
  let lastKmMarked = state.lastKmMarked;
  const prevKmCount = Math.floor(state.currentDistanceKm);
  const currentKmMark = Math.floor(newDistanceKm);

  for (let km = prevKmCount + 1; km <= currentKmMark; km++) {
    const prevKmTime = newSplits.reduce((acc, s) => acc + s.durationSeconds, 0);
    const splitDuration = newElapsed - prevKmTime;
    const splitPace = calculatePace(1, splitDuration);

    newSplits.push({
      km,
      durationSeconds: Math.round(splitDuration),
      paceMinKm: splitPace,
      isBest: false,
    });

    lastKmMarked = km;
  }

  if (newSplits.length > state.splits.length) {
    const minSplitPace = Math.min(...newSplits.map((s) => s.paceMinKm));
    newSplits = newSplits.map((s) => ({ ...s, isBest: s.paceMinKm === minSplitPace }));
  }

  // Histórico de FC: amostra a cada 5s para evitar arrays gigantes
  const newHeartRateHistory = [...(state.heartRateHistory || [])];
  if (Math.floor(newElapsed) % 5 === 0 && newElapsed > (state.heartRateHistory?.[state.heartRateHistory.length - 1]?.time ?? -1)) {
    newHeartRateHistory.push({ time: Math.floor(newElapsed), bpm: heartRateBpm });
    if (newHeartRateHistory.length > 600) newHeartRateHistory.shift(); // Máx 600 pontos = 50min
  }

  const newRollingPaces = [...(state.rollingPaces || [])];
  if (currentPace > 0) {
    newRollingPaces.push(currentPace);
    if (newRollingPaces.length > 10) newRollingPaces.shift();
  }

  return {
    ...state,
    elapsedSeconds: newElapsed,
    currentDistanceKm: newDistanceKm,
    currentPaceMinKm: currentPace,
    avgPaceMinKm: avgPace > 0 ? avgPace : basePace,
    speedKmh: speed,
    calories: Math.round(calories),
    progressPercent,
    heartRateBpm,
    cadenceSpm,
    heartRateHistory: newHeartRateHistory,
    routePoints: newRoutePoints,
    splits: newSplits,
    lastKmMarked,
    rollingPaces: newRollingPaces,
    status: isCompleted ? 'completed' : 'running',
  };
}

export function tickGpsRun(state, deltaSeconds = 1) {
  if (state.status !== 'running') return state;

  const effectiveDelta = deltaSeconds * (state.speedMultiplier || 1);
  const newElapsed = state.elapsedSeconds + effectiveDelta;
  const basePace = state.targetPaceMinKm || 5.7;

  const newDistanceKm = state.currentDistanceKm;

  let isCompleted = false;
  const avgPace = calculatePace(newDistanceKm, newElapsed);
  const speed = calculateSpeed(newDistanceKm, newElapsed);
  const calories = calculateCalories(newDistanceKm, newElapsed);
  const progressPercent = Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100);

  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(speed || state.speedKmh, newElapsed / 60);
  const cadenceSpm = estimateCadence(speed || state.speedKmh);

  // Histórico de FC
  const newHeartRateHistory = [...(state.heartRateHistory || [])];
  if (Math.floor(newElapsed) % 5 === 0 && newElapsed > (state.heartRateHistory?.[state.heartRateHistory.length - 1]?.time ?? -1)) {
    newHeartRateHistory.push({ time: Math.floor(newElapsed), bpm: heartRateBpm });
    if (newHeartRateHistory.length > 600) newHeartRateHistory.shift();
  }

  const { newSplits, lastKmMarked } = computeSplits(
    newDistanceKm, state.currentDistanceKm, newElapsed, state.splits, state.lastKmMarked
  );

  return {
    ...state,
    elapsedSeconds: newElapsed,
    currentPaceMinKm: state.currentPaceMinKm,
    avgPaceMinKm: avgPace > 0 ? avgPace : basePace,
    speedKmh: speed,
    calories: Math.round(calories),
    progressPercent,
    heartRateBpm,
    cadenceSpm,
    heartRateHistory: newHeartRateHistory,
    splits: newSplits,
    lastKmMarked,
    status: 'running',
  };
}

export function processGpsUpdate(state, latitude, longitude, accuracy, timestamp) {
  if (!state || state.status !== 'running') return null;

  const lastGpsTs = state.lastGpsTimestamp;
  const deltaSec = lastGpsTs != null && timestamp != null ? (timestamp - lastGpsTs) / 1000 : 0;

  let addedKm = 0;
  let instantSpeedKmh = 0;
  if (state.lastPosition) {
    addedKm = calculateHaversineDistance(
      state.lastPosition.lat,
      state.lastPosition.lon,
      latitude,
      longitude
    );
    if (deltaSec > 0) {
      instantSpeedKmh = (addedKm / deltaSec) * 3600;
      if (instantSpeedKmh > 45 || !isFinite(instantSpeedKmh)) addedKm = 0;
    }
  }

  const newDistanceKm = Math.min(state.targetDistanceKm, state.currentDistanceKm + addedKm);
  const isCompleted = newDistanceKm >= state.targetDistanceKm;
  const newRoutePoints = [...state.routePoints, [latitude, longitude]];

  let currentPaceMinKm = state.currentPaceMinKm;
  let speedKmh = state.speedKmh;

  if (deltaSec > 1 && addedKm > 0 && instantSpeedKmh > 0) {
    if (instantSpeedKmh > 2 && instantSpeedKmh < 45) {
      speedKmh = instantSpeedKmh;
      currentPaceMinKm = calculateInstantPaceFromSpeed(instantSpeedKmh);
    }
  }

  const newRollingPaces = [...(state.rollingPaces || [])];
  if (currentPaceMinKm > 0) {
    newRollingPaces.push(currentPaceMinKm);
    if (newRollingPaces.length > 10) newRollingPaces.shift();
  }

  const smoothedPace = newRollingPaces.length > 0
    ? newRollingPaces.reduce((a, b) => a + b, 0) / newRollingPaces.length
    : currentPaceMinKm;

  // IMPORTANTE: NÃO adicionar deltaSec ao elapsedSeconds aqui.
  // O timer (tickGpsRun) já incrementa elapsedSeconds a cada 1s.
  // Se ambos somassem, o tempo decorrido avançaria em dobro.
  const newElapsed = state.elapsedSeconds;

  const avgPace = calculatePace(newDistanceKm, newElapsed);
  const calories = calculateCalories(newDistanceKm, newElapsed);
  const progressPercent = Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100);

  // Histórico de FC
  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(speedKmh || state.speedKmh, newElapsed / 60);
  const newHeartRateHistory = [...(state.heartRateHistory || [])];
  if (Math.floor(newElapsed) % 5 === 0 && newElapsed > (state.heartRateHistory?.[state.heartRateHistory.length - 1]?.time ?? -1)) {
    newHeartRateHistory.push({ time: Math.floor(newElapsed), bpm: heartRateBpm });
    if (newHeartRateHistory.length > 600) newHeartRateHistory.shift();
  }

  const { newSplits, lastKmMarked } = computeSplits(
    newDistanceKm, state.currentDistanceKm, newElapsed, state.splits, state.lastKmMarked
  );

  return {
    ...state,
    elapsedSeconds: newElapsed,
    currentDistanceKm: newDistanceKm,
    currentPaceMinKm: smoothedPace,
    avgPaceMinKm: avgPace > 0 ? avgPace : state.avgPaceMinKm,
    speedKmh: speedKmh,
    calories: Math.round(calories),
    progressPercent,
    gpsAccuracy: Math.round(accuracy),
    heartRateBpm,
    cadenceSpm: estimateCadence(speedKmh || state.speedKmh),
    heartRateHistory: newHeartRateHistory,
    lastPosition: { lat: latitude, lon: longitude },
    lastGpsTimestamp: timestamp,
    routePoints: newRoutePoints,
    splits: newSplits,
    lastKmMarked,
    rollingPaces: newRollingPaces,
    status: isCompleted ? 'completed' : 'running',
  };
}
