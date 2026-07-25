import { estimateMaxHeartRate } from '../utils/calculations';
import type { MetricConfidence, RunMode } from '../types/domain';

const DEFAULT_MAX_HR = 190;
const DEFAULT_RESTING_HR = 60;

/**
 * Estima FC a partir da velocidade usando o método da reserva de frequência
 * cardíaca (Karvonen). `elapsedMinutes` aplica a deriva cardiovascular.
 */
export function estimateHeartRate(
  speedKmh: number,
  elapsedMinutes = 0,
  maxHr: number = DEFAULT_MAX_HR,
  restingHr: number = DEFAULT_RESTING_HR
): number {
  const max = Number.isFinite(maxHr) && maxHr > 0 ? maxHr : DEFAULT_MAX_HR;
  const resting = Number.isFinite(restingHr) && restingHr > 0 ? restingHr : DEFAULT_RESTING_HR;
  const hrReserve = Math.max(1, max - resting);

  if (!speedKmh || speedKmh <= 0) {
    return Math.round(resting + hrReserve * 0.35);
  }

  const speedPct = Math.min(0.95, Math.max(0.25, (speedKmh - 3) / 17));
  const hr = resting + hrReserve * speedPct;

  const drift = Math.min(0.08, Math.max(0, elapsedMinutes) * 0.002);
  return Math.round(Math.min(max, hr * (1 + drift)));
}

/** FC máxima efetiva: valor manual do perfil ou estimativa por idade. */
export function resolveMaxHeartRate(ageYears: number, manualMaxHr: number | null): number {
  if (manualMaxHr && manualMaxHr > 100 && manualMaxHr < 230) return Math.round(manualMaxHr);
  return estimateMaxHeartRate(ageYears);
}

export function estimateCadence(speedKmh: number): number {
  if (!speedKmh || speedKmh <= 0) return 160;
  const cadence = 160 + speedKmh * 1.8;
  return Math.round(Math.min(195, Math.max(145, cadence)));
}

export function calculateInstantPaceFromSpeed(speedKmh: number): number {
  if (!speedKmh || speedKmh <= 0) return 0;
  return 60 / speedKmh;
}

export function calculateInstantSpeedFromPace(paceMinKm: number): number {
  if (!paceMinKm || paceMinKm <= 0) return 0;
  return 60 / paceMinKm;
}

export function smoothRollingPaces(paces: number[] | undefined, windowSize = 5): number {
  if (!paces || paces.length === 0) return 0;
  if (paces.length <= windowSize) {
    return paces.reduce((a, b) => a + b, 0) / paces.length;
  }
  const recent = paces.slice(-windowSize);
  return recent.reduce((a, b) => a + b, 0) / windowSize;
}

type MetricName =
  | 'distance'
  | 'currentPace'
  | 'avgPace'
  | 'speed'
  | 'calories'
  | 'heartRate'
  | 'cadence'
  | 'splits'
  | 'route';

/**
 * Declara honestamente a origem de cada métrica exibida:
 * medida (sensor), calculada (derivada de medidas), estimada ou simulada.
 */
export function getMetricConfidence(
  metricName: MetricName | string,
  mode: RunMode | string | undefined,
  hasBluetoothHr = false
): MetricConfidence {
  const isGps = mode === 'gps';
  const map: Record<MetricName, MetricConfidence> = {
    distance: isGps ? 'measured' : 'simulated',
    currentPace: isGps ? 'measured' : 'simulated',
    avgPace: isGps ? 'measured' : 'simulated',
    speed: isGps ? 'measured' : 'simulated',
    calories: isGps ? 'calculated' : 'simulated',
    heartRate: hasBluetoothHr ? 'measured' : 'estimated',
    cadence: 'estimated',
    splits: isGps ? 'measured' : 'simulated',
    route: isGps ? 'measured' : 'simulated',
  };
  return map[metricName as MetricName] ?? 'estimated';
}
