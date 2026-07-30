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
import { estimateGradeEffort } from './elevationService';
import { getSettings } from './storageService';
import type { HeartRateSample, RoutePoint, RunMode, RunState, Split } from '../types/domain';

const MAX_LIVE_ROUTE_POINTS = 3000;

/** Acima disso o fix não é usado nem para o indicador de distância. */
export const MAX_GPS_ACCURACY_M = 50;
/** Só fixes com esta precisão (ou melhor) podem mover a distância. */
export const GPS_ACCURACY_FOR_DISTANCE_M = 25;
/** Deslocamento mínimo absoluto; o efetivo escala com a precisão do fix. */
const MIN_GPS_MOVE_M = 8;
/** Fixes iniciais usados apenas para ancorar a posição (aquecimento do GPS). */
const GPS_WARMUP_FIXES = 2;
/** Abaixo desta velocidade o usuário está parado — jitter, não deslocamento. */
const MIN_GPS_SPEED_KMH = 2;
const MAX_PLAUSIBLE_SPEED_KMH = 45;
/** Sem movimento aceito por este tempo, a sessão entra em estado "parado". */
const STATIONARY_AFTER_S = 15;
/** Precisão assumida quando o dispositivo não informa nenhuma. */
const ASSUMED_ACCURACY_M = 20;

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

/** Há quantos segundos o último movimento válido foi registrado. */
function secondsSinceMovement(lastMovementTs: number | null, nowMs: number): number {
  if (lastMovementTs == null) return Number.POSITIVE_INFINITY;
  return Math.max(0, (nowMs - lastMovementTs) / 1000);
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
    movingSeconds: 0,
    currentDistanceKm: 0,
    // Ritmo começa indefinido (0 → a UI mostra "--"): exibir o ritmo-alvo aqui
    // fazia o app inventar um ritmo antes do primeiro metro percorrido.
    currentPaceMinKm: 0,
    avgPaceMinKm: 0,
    speedKmh: 0,
    calories: 0,
    progressPercent: 0,

    heartRateBpm: estimateHeartRate(0, 0, profile.maxHr, profile.restingHr),
    cadenceSpm: 0,

    routePoints: [],
    lastPosition: null,
    gpsAccuracy: null,
    gpsDegraded: false,
    isStationary: true,
    gpsFixCount: 0,
    lastMovementTs: null,
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
    pausedAccumMs: 0,
    pausedAtMs: null,
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

  // No simulador o corredor nunca para: tempo total == tempo em movimento.
  const newMovingSeconds = state.mode === 'simulation' ? newElapsed : state.movingSeconds;

  const avgPace = calculatePace(newDistanceKm, newMovingSeconds);
  const speed = calculateSpeed(newDistanceKm, newMovingSeconds);
  const gradeFactor = estimateGradeEffort(newDistanceKm, state.elevationGainM);
  const calories = calculateCalories(newDistanceKm, newMovingSeconds, profile.weightKg, gradeFactor);
  const progressPercent = Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100);

  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(speed, newMovingSeconds / 60, profile.maxHr, profile.restingHr);
  const cadenceSpm = estimateCadence(speed);

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
    newMovingSeconds,
    state.splits,
    state.lastKmMarked
  );

  return {
    ...state,
    elapsedSeconds: newElapsed,
    movingSeconds: newMovingSeconds,
    currentDistanceKm: newDistanceKm,
    currentPaceMinKm: currentPace,
    avgPaceMinKm: avgPace,
    speedKmh: speed,
    calories: Math.round(calories),
    progressPercent,
    heartRateBpm,
    cadenceSpm,
    isStationary: state.mode === 'simulation' ? false : state.isStationary,
    heartRateHistory: appendHeartRateSample(state.heartRateHistory, newElapsed, heartRateBpm),
    routePoints: newRoutePoints,
    splits: newSplits,
    lastKmMarked,
    rollingPaces: pushRollingPace(state.rollingPaces, currentPace),
    status: isCompleted ? 'completed' : 'running',
  };
}

/**
 * Avanço do relógio numa corrida por GPS. A distância vem exclusivamente de
 * processGpsUpdate; aqui só o tempo corre — e o tempo em movimento só acumula
 * enquanto o GPS confirma deslocamento real.
 */
export function tickGpsRun(state: RunState, deltaSeconds = 1, nowMs = Date.now()): RunState {
  if (state.status !== 'running') return state;

  const profile = getProfile();
  const delta = Number.isFinite(deltaSeconds) && deltaSeconds > 0 ? deltaSeconds : 0;
  const newElapsed = state.elapsedSeconds + delta;
  const newDistanceKm = state.currentDistanceKm;

  const isStationary = secondsSinceMovement(state.lastMovementTs, nowMs) > STATIONARY_AFTER_S;
  const newMovingSeconds = state.movingSeconds + (isStationary ? 0 : delta);

  const speedKmh = isStationary ? 0 : state.speedKmh;
  const currentPaceMinKm = isStationary ? 0 : state.currentPaceMinKm;

  const avgPace = calculatePace(newDistanceKm, newMovingSeconds);
  const gradeFactor = estimateGradeEffort(newDistanceKm, state.elevationGainM);
  const calories = calculateCalories(newDistanceKm, newMovingSeconds, profile.weightKg, gradeFactor);
  const progressPercent =
    state.targetDistanceKm > 0
      ? Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100)
      : 0;

  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(speedKmh, newMovingSeconds / 60, profile.maxHr, profile.restingHr);

  const { newSplits, lastKmMarked } = computeSplits(
    newDistanceKm,
    state.currentDistanceKm,
    newMovingSeconds,
    state.splits,
    state.lastKmMarked
  );

  return {
    ...state,
    elapsedSeconds: newElapsed,
    movingSeconds: newMovingSeconds,
    avgPaceMinKm: avgPace,
    currentPaceMinKm,
    speedKmh,
    calories: Math.round(calories),
    progressPercent,
    heartRateBpm,
    cadenceSpm: estimateCadence(speedKmh),
    isStationary,
    heartRateHistory: appendHeartRateSample(state.heartRateHistory, newElapsed, heartRateBpm),
    splits: newSplits,
    lastKmMarked,
    status: 'running',
  };
}

/**
 * Integra um fix de GPS na corrida.
 *
 * Filtros em camadas — nesta ordem — para que estar parado nunca gere distância:
 *   1. precisão pior que MAX_GPS_ACCURACY_M: só atualiza o indicador de sinal;
 *   2. precisão pior que GPS_ACCURACY_FOR_DISTANCE_M: não move a âncora;
 *   3. os primeiros fixes apenas ancoram a posição (aquecimento do GPS);
 *   4. deslocamento precisa superar max(8 m, 60 % da precisão do fix);
 *   5. a velocidade (Doppler do aparelho, quando disponível, ou derivada das
 *      posições) precisa ficar entre MIN_GPS_SPEED_KMH e MAX_PLAUSIBLE_SPEED_KMH.
 *
 * `speedMps` é `position.coords.speed` — a medida Doppler do aparelho, muito
 * mais confiável que a diferença entre coordenadas para detectar parada.
 */
export function processGpsUpdate(
  state: RunState | null,
  latitude: number,
  longitude: number,
  accuracy: number | null,
  timestamp: number | null,
  speedMps: number | null = null
): RunState | null {
  if (!state || state.status !== 'running' || state.mode !== 'gps') return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const nowTs = timestamp != null && Number.isFinite(timestamp) ? timestamp : Date.now();

  // Fixes imprecisos não movem a distância, mas atualizam o indicador de sinal.
  if (accuracy != null && Number.isFinite(accuracy) && accuracy > MAX_GPS_ACCURACY_M) {
    return { ...state, gpsAccuracy: Math.round(accuracy), gpsDegraded: true };
  }

  const profile = getProfile();
  const acc =
    accuracy != null && Number.isFinite(accuracy) && accuracy > 0 ? accuracy : ASSUMED_ACCURACY_M;
  const usableForDistance = acc <= GPS_ACCURACY_FOR_DISTANCE_M;
  const fixCount = state.gpsFixCount + 1;

  const deltaSec =
    state.lastGpsTimestamp != null ? (nowTs - state.lastGpsTimestamp) / 1000 : 0;
  const movedM = state.lastPosition
    ? calculateHaversineDistance(state.lastPosition.lat, state.lastPosition.lon, latitude, longitude) *
      1000
    : 0;

  // O portão de ruído cresce com a incerteza do fix: com ±20 m, saltos de
  // 12 m são indistinguíveis de estar parado.
  const moveGateM = Math.max(MIN_GPS_MOVE_M, acc * 0.6);
  const derivedKmh = deltaSec > 0 && movedM > 0 ? movedM / 1000 / (deltaSec / 3600) : 0;
  const dopplerKmh =
    speedMps != null && Number.isFinite(speedMps) && speedMps >= 0 ? speedMps * 3.6 : null;

  const warmedUp = fixCount > GPS_WARMUP_FIXES && state.lastPosition != null;
  const dopplerSaysMoving = dopplerKmh == null || dopplerKmh >= MIN_GPS_SPEED_KMH;
  const accepted =
    usableForDistance &&
    warmedUp &&
    movedM >= moveGateM &&
    derivedKmh >= MIN_GPS_SPEED_KMH &&
    derivedKmh <= MAX_PLAUSIBLE_SPEED_KMH &&
    dopplerSaysMoving;

  const addedKm = accepted ? movedM / 1000 : 0;
  const newDistanceKm = state.currentDistanceKm + addedKm;

  // Movimento real também é confirmado pelo Doppler antes de o deslocamento
  // acumulado vencer o portão — evita marcar "parado" quem corre devagar.
  const dopplerMoving = dopplerKmh != null && dopplerKmh >= MIN_GPS_SPEED_KMH;
  const lastMovementTs = accepted || dopplerMoving ? nowTs : state.lastMovementTs;
  const isStationary = secondsSinceMovement(lastMovementTs, nowTs) > STATIONARY_AFTER_S;

  // A âncora só avança em fixes confiáveis; senão o ruído viraria deslocamento.
  const anchorMoves = usableForDistance && (accepted || state.lastPosition == null || !warmedUp);
  const lastPosition = anchorMoves ? { lat: latitude, lon: longitude } : state.lastPosition;

  // A rota registra apenas deslocamentos aceitos (e o ponto de partida),
  // mantendo o traçado do mapa livre do zigue-zague de jitter.
  const isFirstPoint = state.routePoints.length === 0 && anchorMoves;
  const newRoutePoints =
    accepted || isFirstPoint
      ? capRoutePoints([...state.routePoints, [latitude, longitude] as RoutePoint])
      : state.routePoints;

  let speedKmh = isStationary ? 0 : state.speedKmh;
  let currentPaceMinKm = isStationary ? 0 : state.currentPaceMinKm;
  let newRollingPaces = state.rollingPaces;

  if (accepted) {
    speedKmh = dopplerKmh != null && dopplerKmh > 0 ? dopplerKmh : derivedKmh;
    const instantPace = calculateInstantPaceFromSpeed(speedKmh);
    newRollingPaces = pushRollingPace(state.rollingPaces, instantPace);
    currentPaceMinKm =
      newRollingPaces.length > 0
        ? newRollingPaces.reduce((a, b) => a + b, 0) / newRollingPaces.length
        : instantPace;
  }

  // O timer (tickGpsRun) é o dono do tempo — não contar duas vezes aqui.
  const movingSeconds = state.movingSeconds;
  const avgPace = calculatePace(newDistanceKm, movingSeconds);
  const gradeFactor = estimateGradeEffort(newDistanceKm, state.elevationGainM);
  const calories = calculateCalories(newDistanceKm, movingSeconds, profile.weightKg, gradeFactor);
  const progressPercent =
    state.targetDistanceKm > 0
      ? Math.min(100, (newDistanceKm / state.targetDistanceKm) * 100)
      : 0;
  const isCompleted = state.targetDistanceKm > 0 && newDistanceKm >= state.targetDistanceKm;

  const heartRateBpm = state.bluetoothHrConnected
    ? state.heartRateBpm
    : estimateHeartRate(speedKmh, movingSeconds / 60, profile.maxHr, profile.restingHr);

  const { newSplits, lastKmMarked } = computeSplits(
    newDistanceKm,
    state.currentDistanceKm,
    movingSeconds,
    state.splits,
    state.lastKmMarked
  );

  return {
    ...state,
    currentDistanceKm: newDistanceKm,
    currentPaceMinKm,
    avgPaceMinKm: avgPace,
    speedKmh,
    calories: Math.round(calories),
    progressPercent,
    gpsAccuracy: Math.round(acc),
    gpsDegraded: false,
    gpsFixCount: fixCount,
    isStationary,
    lastMovementTs,
    heartRateBpm,
    cadenceSpm: estimateCadence(speedKmh),
    heartRateHistory: appendHeartRateSample(state.heartRateHistory, state.elapsedSeconds, heartRateBpm),
    lastPosition,
    // O timestamp acompanha a âncora: se o fix não a moveu, o intervalo
    // continua contando desde o último ponto aceito — do contrário a
    // velocidade instantânea explodiria (8 m acumulados / 1 s).
    lastGpsTimestamp: anchorMoves ? nowTs : state.lastGpsTimestamp,
    routePoints: newRoutePoints,
    splits: newSplits,
    lastKmMarked,
    rollingPaces: newRollingPaces,
    status: isCompleted ? 'completed' : 'running',
  };
}
