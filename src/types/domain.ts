/**
 * Tipos de domínio compartilhados do RUNOVA.
 * Fonte única de verdade para o estado de corrida, histórico e configurações.
 */

/** Ponto de rota no formato [latitude, longitude]. */
export type RoutePoint = [number, number];

export type RunMode = 'simulation' | 'gps';

export type RunStatus = 'idle' | 'running' | 'paused' | 'completed';

export type UnitSystem = 'metric' | 'imperial';

export interface Split {
  km: number;
  durationSeconds: number;
  paceMinKm: number;
  isBest: boolean;
}

export interface HeartRateSample {
  time: number;
  bpm: number;
}

export interface GeoPosition {
  lat: number;
  lon: number;
}

export interface RunState {
  targetDistanceKm: number;
  targetDurationSeconds: number;
  targetPaceMinKm: number;
  mode: RunMode;

  elapsedSeconds: number;
  /** Tempo com movimento real detectado — base do ritmo médio e das calorias. */
  movingSeconds: number;
  currentDistanceKm: number;
  currentPaceMinKm: number;
  avgPaceMinKm: number;
  speedKmh: number;
  calories: number;
  progressPercent: number;

  heartRateBpm: number;
  cadenceSpm: number;

  routePoints: RoutePoint[];
  /** Última posição aceita como real (âncora do cálculo de distância). */
  lastPosition: GeoPosition | null;
  gpsAccuracy: number | null;
  gpsDegraded: boolean;
  /** true quando nenhum movimento válido é detectado há alguns segundos. */
  isStationary: boolean;
  /** Fixes já aceitos — os primeiros são descartados (aquecimento do GPS). */
  gpsFixCount: number;
  /** Timestamp (ms) do último deslocamento aceito. */
  lastMovementTs: number | null;
  splits: Split[];
  lastKmMarked: number;

  status: RunStatus;
  speedMultiplier: number;

  rollingPaces: number[];
  heartRateHistory: HeartRateSample[];
  bluetoothHrConnected: boolean;
  lastGpsTimestamp: number | null;
  elevationGainM: number;
  lastElevationM: number | null;
  startedAt: number | null;
  /** Total de milissegundos em pausa — descontado do relógio de parede. */
  pausedAccumMs: number;
  /** Instante (ms) em que a pausa atual começou, ou null se está correndo. */
  pausedAtMs: number | null;
}

/** Corrida persistida no histórico local. */
export interface RunRecord {
  id: string;
  date: string;
  distanceKm: number;
  targetDistanceKm: number;
  durationSeconds: number;
  /** Tempo em movimento; ausente em corridas salvas antes desta métrica. */
  movingSeconds?: number;
  targetDurationSeconds: number;
  paceMinKm: number;
  targetPaceMinKm: number;
  speedKmh: number;
  calories: number;
  completedGoal: boolean;
  routePoints: RoutePoint[];
  splits: Split[];
  heartRateHistory: HeartRateSample[];
  mode: RunMode;
  speedMultiplier: number;
  elevationGainM: number;
  weather: WeatherSnapshot | null;
  locationLabel: string | null;
}

export interface WeatherSnapshot {
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  emoji: string;
  windSpeed: number;
  uvIndex: number;
  weatherCode: number;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  windSpeed: number;
  uvIndex: number;
  emoji: string;
  description: string;
}

export interface AirQuality {
  aqi: number;
  pm25: number;
  pm10: number;
  label: string;
  color: string;
}

export interface ConditionsScore {
  score: number;
  label: string;
}

export interface RunStats {
  totalDistanceKm: number;
  totalDurationSeconds: number;
  avgPaceMinKm: number;
  totalRuns: number;
  totalCalories: number;
  totalElevationM: number;
  currentStreakDays: number;
  thisWeekKm: number;
  lastRun: RunRecord | null;
}

export interface UserSettings {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  restingHrBpm: number;
  maxHrBpm: number | null;
  voiceMuted: boolean;
  units: UnitSystem;
  audioCuesKm: boolean;
}

export interface ActiveRunSnapshot {
  savedAt: number;
  runState: RunState;
}

export interface StorageWriteResult {
  ok: boolean;
  runs: RunRecord[];
  warning?: string;
  error?: string;
}

/** Confiança declarada de uma métrica exibida ao usuário. */
export type MetricConfidence = 'measured' | 'calculated' | 'estimated' | 'simulated';

export interface PersonalRecord {
  label: string;
  distanceKm: number;
  durationSeconds: number;
  paceMinKm: number;
  runId: string;
  date: string;
}

export interface HeartRateZone {
  index: number;
  name: string;
  minBpm: number;
  maxBpm: number;
  color: string;
  seconds: number;
  percent: number;
}
