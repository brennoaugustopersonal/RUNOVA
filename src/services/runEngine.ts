import {
  calculatePace,
  calculateSpeed,
  calculateCalories,
  calculateHaversineDistance,
} from '../utils/calculations';
import {
  estimateHeartRate,
  estimateCadence,
  calculateInstantPaceFromSpeed,
  resolveMaxHeartRate,
} from './physioEstimation';
import { getSettings } from './storageService';
import type { HeartRateSample, RoutePoint, RunMode, RunState, Split } from '../types/domain';

const MAX_LIVE_ROUTE_POINTS = 3000;
const MIN_GPS_MOVE_M = 3; // ignora jitter abaixo de 3 metros
const MAX_GPS_ACCURACY_M = 50;
const MAX_PLAUSIBLE_SPEED_KMH = 45;
const HR_SAMPLE_INTERVAL_S = 5;
const MAX_HR_SAMPLES = 600; // 600 × 5s = 50 min
const MAX_ROLLING_PACES = 10;

interface SplitResult {
  newSplits: Split[];
  lastKmMarked: number;
}

/**
 * Calcula e marca os splits por km. Compartilhado por tickRunSimulation,
 * tickGpsRun e processGpsUpdate para evitar divergência entre os modos.
 */
function computeSplits(
  newDistanceKm: number,
  currentDistanceKm: number,
  newElapsed: number,
  existingSplits: Split[],
  existingLastKmMarked: number
): SplitResult {
  const prevKmCount = Math.floor(currentDistanceKm);
  const currentKmMark = Math.floor(newDistanceKm);

  if (currentKmMark <= prevKmCount) {
    return { newSplits: existingSplits, lastKmMarked: existingLastKmMarked };
  }

  const newSplits = [...existingSplits];
  let lastKmMarked = existingLastKmMarked;
  // Soma acumulada mantida fora do laço — evita O(n²) em corridas longas.
  let accumulatedSeconds = newSplits.reduce((acc, s) => acc + s.durationSeconds, 0);

  for (let km = prevKmCount + 1; km <= currentKmMark; km++) {
    const splitDuration = Math.max(0, newElapsed - accumulatedSeconds);
    newSplits.push({
      km,
      durationSeconds: Math.round(splitDuration),
      paceMinKm: calculatePace(1, splitDuration),
      isBest: false,
    });
    accumulatedSeconds += Math.round(splitDuration);
    lastKmMarked = km;
  }

  const paces = newSplits.map((s) => s.paceMinKm).filter((p) => p > 0);
  const minSplitPace = paces.length > 0 ? Math.min(...paces) : 0;
  return {
    newSplits: newSplits.map((s) => ({ ...s, isBest: s.paceMinKm > 0 && s.paceMinKm === minSplitPace })),
    lastKmMarked,
  };
}

function capRoutePoints(points: RoutePoint[]): RoutePoint[] {
  if (!Array.isArray(points) || points.length <= MAX_LIVE_ROUTE_POINTS) return points;
  const step = Math.ceil(points.length / MAX_LIVE_ROUTE_POINTS);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

interface PhysioProfile {
  weightKg: number;
  maxHr: number;
  restingHr: number;
}

function getProfile(): PhysioProfile {
  try {
    const settings = getSettings();
    return {
      weightKg: settings.weightKg || 72,
      maxHr: resolveMaxHeartRate(settings.ageYears, settings.maxHrBpm),
      restingHr: settings.restingHrBpm || 60,
    };
  } catch {
    return { weightKg: 72, maxHr: 190, restingHr: 60 };
  }
}

/** Amostra a FC a cada 5 s sem deixar o histórico crescer indefinidamente. */
function appendHeartRateSample(
  history: HeartRateSample[] | undefined,
  elapsedSeconds: number,
  bpm: number
): HeartRateSample[] {
  const list = history || [];
  const lastTime = list.length > 0 ? list[list.length - 1].time : -1;
  const bucket = Math.floor(elapsedSeconds / HR_SAMPLE_INTERVAL_S) * HR_SAMPLE_INTERVAL_S;
  if (bucket <= lastTime) return list;

  const next = [...list, { time: bucket, bpm }];
  return next.length > MAX_HR_SAMPLES ? next.slice(next.length - MAX_HR_SAMPLES) : next;
}

function pushRollingPace(paces: number[] | undefined, pace: number): number[] {
  if (!(pace > 0)) return paces || [];
  const next = [...(paces || []), pace];
  return next.length > MAX_ROLLING_PACES ? next.slice(next.length - MAX_ROLLING_PACES) : next;
}

export function createInitialRunState(
  targetDistanceKm = 2.1,
  targetDurationMinutes = 12,
  mode: RunMode = 'simulation'
): RunState {
  const distance = Number(targetDistanceKm) > 0 ? Number(targetDistanceKm) : 2.1;
  // Entradas inválidas (negativas/NaN) viram 1 minuto — nunca um ritmo-alvo
  // negativo, que envenenaria todos os cálculos derivados.
  const rawMinutes = Number(targetDurationMinutes);
  const minutes = Number.isFinite(rawMinutes) && rawMinutes >= 1 ? rawMinutes : 1;
  const targetDurationSeconds = Math.max(60, minutes * 60);
  const targetPace = minutes / distance;
  const profile = getProfile();

  return {
    targetDistanceKm: distance,
    targetDurationSeconds,
    targetPaceMinKm: targetPace,
    mode,

    elapsedSeconds: 0,
    currentDistanceKm: 0,
    currentPaceMinKm: targetPace,
    avgPaceMinKm: targetPace,
    speedKmh: 0,
    calories: 0,
    progressPercent: 0,

    heartRateBpm: estimateHeartRate(0, 0, profile.maxHr, profile.restingHr),
    cadenceSpm: estimateCadence(0),

    routePoints: [],
    lastPosition: null,
    gpsAccuracy: null,
    gpsDegraded: false,
    splits: [],
    lastKmMarked: 0,

    status: 'idle',
    speedMultiplier: 1,

    rollingPaces: [],
    heartRateHistory: [],
    bluetoothHrConnected: false,
    lastGpsTimestamp: null,
    elevationGainM: 0,
    lastElevationM: null,
    startedAt: null,
  };
}

export function tickRunSimulation(state: RunState, deltaSeconds = 1): RunState {
  if (state.status !== 'running') return state;

  const profile = getProfile();
  const effectiveDelta = deltaSeconds * (state.speedMultiplier || 1);
  const newElapsed = state.elapsedSeconds + effectiveDelta;
  const basePace = state.targetPaceMinKm || 5.7;

  let newDistanceKm = state.currentDistanceKm;
  let currentPace = state.currentPaceMinKm;

  if (state.mode === 'simulation') {
    const paceNoise = Math.sin(newElapsed / 8) * 0.15 + (Math.random() * 0.08 - 0.04);
    currentPace = Math.max(3.0, basePace + paceNoise);
    newDistanceKm += effectiveDelta / 60 / currentPace;
  }

  let isCompleted = false;
  if (newDistanceKm >= state.targetDistanceKm) {
    newDistanceKm = state.targetDistanceKm;
    isCompleted = true;
  }

  const avgPace = calculatePace(newDistanceKm, newElapsed);
  const speed = calculateSpeed(newDistanceKm, newElapsed);
  const calories = calculateCalories(newDistanceKm, newElapsed, profile.weightKg);
  const progressPercent = Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100);

  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(speed || state.speedKmh, newElapsed / 60, profile.maxHr, profile.restingHr);
  const cadenceSpm = estimateCadence(speed || state.speedKmh);

  // Rota sintética apenas no simulador — nunca contamina uma corrida por GPS.
  let newRoutePoints = state.routePoints;
  if (state.mode === 'simulation') {
    const angle = (newElapsed / 180) * Math.PI;
    const centerLat = -23.5874;
    const centerLon = -46.6576;
    const radius = 0.003 * (newDistanceKm + 0.1);
    const simLat = centerLat + Math.cos(angle) * radius;
    const simLon = centerLon + Math.sin(angle) * radius;
    const lastPoint = newRoutePoints[newRoutePoints.length - 1];
    const shouldAdd =
      !lastPoint ||
      Math.abs(simLat - lastPoint[0]) > 0.00005 ||
      Math.abs(simLon - lastPoint[1]) > 0.00005;
    if (shouldAdd) {
      newRoutePoints = capRoutePoints([...newRoutePoints, [simLat, simLon]]);
    }
  }

  const { newSplits, lastKmMarked } = computeSplits(
    newDistanceKm,
    state.currentDistanceKm,
    newElapsed,
    state.splits,
    state.lastKmMarked
  );

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
    heartRateHistory: appendHeartRateSample(state.heartRateHistory, newElapsed, heartRateBpm),
    routePoints: newRoutePoints,
    splits: newSplits,
    lastKmMarked,
    rollingPaces: pushRollingPace(state.rollingPaces, currentPace),
    status: isCompleted ? 'completed' : 'running',
  };
}

export function tickGpsRun(state: RunState, deltaSeconds = 1): RunState {
  if (state.status !== 'running') return state;

  const profile = getProfile();
  const effectiveDelta = deltaSeconds * (state.speedMultiplier || 1);
  const newElapsed = state.elapsedSeconds + effectiveDelta;
  const basePace = state.targetPaceMinKm || 5.7;
  const newDistanceKm = state.currentDistanceKm;

  const avgPace = calculatePace(newDistanceKm, newElapsed);
  const speed = calculateSpeed(newDistanceKm, newElapsed);
  const calories = calculateCalories(newDistanceKm, newElapsed, profile.weightKg);
  const progressPercent = Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100);

  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(speed || state.speedKmh, newElapsed / 60, profile.maxHr, profile.restingHr);

  const { newSplits, lastKmMarked } = computeSplits(
    newDistanceKm,
    state.currentDistanceKm,
    newElapsed,
    state.splits,
    state.lastKmMarked
  );

  return {
    ...state,
    elapsedSeconds: newElapsed,
    avgPaceMinKm: avgPace > 0 ? avgPace : basePace,
    speedKmh: speed,
    calories: Math.round(calories),
    progressPercent,
    heartRateBpm,
    cadenceSpm: estimateCadence(speed || state.speedKmh),
    heartRateHistory: appendHeartRateSample(state.heartRateHistory, newElapsed, heartRateBpm),
    splits: newSplits,
    lastKmMarked,
    status: 'running',
  };
}

export function processGpsUpdate(
  state: RunState | null,
  latitude: number,
  longitude: number,
  accuracy: number | null,
  timestamp: number | null
): RunState | null {
  if (!state || state.status !== 'running' || state.mode !== 'gps') return null;

  // Fixes imprecisos não movem a distância, mas atualizam o indicador de sinal.
  if (accuracy != null && accuracy > MAX_GPS_ACCURACY_M) {
    return { ...state, gpsAccuracy: Math.round(accuracy), gpsDegraded: true };
  }

  const profile = getProfile();
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
    if (addedKm * 1000 < MIN_GPS_MOVE_M) {
      addedKm = 0;
    }
    if (deltaSec > 0 && addedKm > 0) {
      instantSpeedKmh = (addedKm / deltaSec) * 3600;
      // Descarta saltos impossíveis (perda de sinal, multipath urbano).
      if (instantSpeedKmh > MAX_PLAUSIBLE_SPEED_KMH || !Number.isFinite(instantSpeedKmh)) {
        addedKm = 0;
        instantSpeedKmh = 0;
      }
    }
  }

  const newDistanceKm = Math.min(state.targetDistanceKm, state.currentDistanceKm + addedKm);
  const isCompleted = newDistanceKm >= state.targetDistanceKm;
  const newRoutePoints = capRoutePoints([...state.routePoints, [latitude, longitude]]);

  let currentPaceMinKm = state.currentPaceMinKm;
  let speedKmh = state.speedKmh;
  if (deltaSec > 1 && instantSpeedKmh > 2 && instantSpeedKmh < MAX_PLAUSIBLE_SPEED_KMH) {
    speedKmh = instantSpeedKmh;
    currentPaceMinKm = calculateInstantPaceFromSpeed(instantSpeedKmh);
  }

  const newRollingPaces = pushRollingPace(state.rollingPaces, currentPaceMinKm);
  const smoothedPace =
    newRollingPaces.length > 0
      ? newRollingPaces.reduce((a, b) => a + b, 0) / newRollingPaces.length
      : currentPaceMinKm;

  // O timer (tickGpsRun) é o dono de elapsedSeconds — não contar duas vezes aqui.
  const newElapsed = state.elapsedSeconds;

  const avgPace = calculatePace(newDistanceKm, newElapsed);
  const calories = calculateCalories(newDistanceKm, newElapsed, profile.weightKg);
  const progressPercent = Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100);

  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(
        speedKmh || state.speedKmh,
        newElapsed / 60,
        profile.maxHr,
        profile.restingHr
      );

  const { newSplits, lastKmMarked } = computeSplits(
    newDistanceKm,
    state.currentDistanceKm,
    newElapsed,
    state.splits,
    state.lastKmMarked
  );

  return {
    ...state,
    elapsedSeconds: newElapsed,
    currentDistanceKm: newDistanceKm,
    currentPaceMinKm: smoothedPace,
    avgPaceMinKm: avgPace > 0 ? avgPace : state.avgPaceMinKm,
    speedKmh,
    calories: Math.round(calories),
    progressPercent,
    gpsAccuracy: accuracy != null ? Math.round(accuracy) : state.gpsAccuracy,
    gpsDegraded: false,
    heartRateBpm,
    cadenceSpm: estimateCadence(speedKmh || state.speedKmh),
    heartRateHistory: appendHeartRateSample(state.heartRateHistory, newElapsed, heartRateBpm),
    lastPosition: { lat: latitude, lon: longitude },
    lastGpsTimestamp: timestamp,
    routePoints: newRoutePoints,
    splits: newSplits,
    lastKmMarked,
    rollingPaces: newRollingPaces,
    status: isCompleted ? 'completed' : 'running',
  };
}
