import type { HeartRateSample, HeartRateZone } from '../types/domain';

type MaybeNumber = number | null | undefined;

function toFiniteNumber(value: MaybeNumber): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Calcula a distância entre duas coordenadas geográficas em km usando a Fórmula de Haversine.
 */
export function calculateHaversineDistance(
  lat1: MaybeNumber,
  lon1: MaybeNumber,
  lat2: MaybeNumber,
  lon2: MaybeNumber
): number {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  if (!Number.isFinite(Number(lat1)) || !Number.isFinite(Number(lon1))) return 0;
  if (!Number.isFinite(Number(lat2)) || !Number.isFinite(Number(lon2))) return 0;

  const a1 = Number(lat1);
  const o1 = Number(lon1);
  const a2 = Number(lat2);
  const o2 = Number(lon2);

  const R = 6371; // Raio da Terra em km
  const dLat = ((a2 - a1) * Math.PI) / 180;
  const dLon = ((o2 - o1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a1 * Math.PI) / 180) *
      Math.cos((a2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Ritmo médio em minutos decimais por km. */
export function calculatePace(distanceKm: MaybeNumber, durationSeconds: MaybeNumber): number {
  const d = toFiniteNumber(distanceKm);
  const s = toFiniteNumber(durationSeconds);
  if (d <= 0 || s <= 0) return 0;
  return s / 60 / d;
}

/** Velocidade média em km/h. */
export function calculateSpeed(distanceKm: MaybeNumber, durationSeconds: MaybeNumber): number {
  const d = toFiniteNumber(distanceKm);
  const s = toFiniteNumber(durationSeconds);
  if (d <= 0 || s <= 0) return 0;
  return d / (s / 3600);
}

/**
 * MET de corrida segundo o Compendium of Physical Activities (2011),
 * interpolado por velocidade em km/h.
 */
export function metForSpeed(speedKmh: number): number {
  if (speedKmh <= 0) return 1;
  if (speedKmh < 6.4) return 6.0; // trote leve
  if (speedKmh < 8.0) return 8.3;
  if (speedKmh < 9.7) return 9.8;
  if (speedKmh < 11.3) return 11.0;
  if (speedKmh < 12.9) return 11.8;
  if (speedKmh < 14.5) return 12.8;
  if (speedKmh < 16.1) return 14.5;
  if (speedKmh < 17.7) return 16.0;
  return 19.0;
}

/**
 * Estima calorias a partir de distância, duração e peso.
 * `gradeFactor` (>= 1) aumenta o gasto em subidas — ver estimateGradeEffort.
 */
export function calculateCalories(
  distanceKm: MaybeNumber,
  durationSeconds: MaybeNumber,
  weightKg = 72,
  gradeFactor = 1
): number {
  const d = toFiniteNumber(distanceKm);
  if (d <= 0) return 0;

  const weight = toFiniteNumber(weightKg) > 0 ? Number(weightKg) : 72;
  const speedKmh = calculateSpeed(d, durationSeconds);
  const met = metForSpeed(speedKmh);
  const durationHours = toFiniteNumber(durationSeconds) / 3600;
  const factor = Number.isFinite(gradeFactor) && gradeFactor > 0 ? gradeFactor : 1;

  const calories = met * weight * durationHours * factor;
  return Math.round(calories > 0 ? calories : d * 65);
}

export interface PerformanceDiff {
  percent: number;
  isBetter: boolean;
  diffFormatted: string;
}

/** Compara dois ritmos (min/km) e retorna a diferença percentual e o status. */
export function calculatePerformanceDiff(
  currentPace: MaybeNumber,
  targetOrAvgPace: MaybeNumber
): PerformanceDiff {
  const current = toFiniteNumber(currentPace);
  const reference = toFiniteNumber(targetOrAvgPace);
  if (current <= 0 || reference <= 0) {
    return { percent: 0, isBetter: true, diffFormatted: '0%' };
  }

  const diffPercent = ((reference - current) / reference) * 100;
  const isBetter = diffPercent >= 0;
  const absPercent = Math.abs(diffPercent).toFixed(1);

  const diffFormatted =
    Math.abs(diffPercent) < 0.05 ? 'Igual' : `${isBetter ? '+' : '-'}${absPercent}%`;

  return { percent: diffPercent, isBetter, diffFormatted };
}

/**
 * FC máxima estimada pela fórmula de Tanaka et al. (2001) — mais precisa
 * que a clássica "220 - idade" em adultos.
 */
export function estimateMaxHeartRate(ageYears: MaybeNumber): number {
  const age = toFiniteNumber(ageYears);
  if (age <= 0) return 190;
  return Math.round(208 - 0.7 * age);
}

/**
 * VO2máx estimado pela fórmula de Daniels & Gilbert a partir de uma
 * performance (distância em metros / tempo em minutos).
 */
export function estimateVo2Max(distanceKm: MaybeNumber, durationSeconds: MaybeNumber): number {
  const d = toFiniteNumber(distanceKm) * 1000;
  const t = toFiniteNumber(durationSeconds) / 60;
  if (d < 1000 || t <= 0) return 0;

  const velocity = d / t; // metros por minuto
  const vo2 = -4.6 + 0.182258 * velocity + 0.000104 * velocity * velocity;
  const percentMax =
    0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);

  const result = vo2 / percentMax;
  if (!Number.isFinite(result) || result <= 0) return 0;
  return Math.round(Math.min(90, Math.max(15, result)) * 10) / 10;
}

const ZONE_DEFS: ReadonlyArray<{ name: string; from: number; to: number; color: string }> = [
  { name: 'Z1 · Recuperação', from: 0.5, to: 0.6, color: '#38bdf8' },
  { name: 'Z2 · Aeróbico', from: 0.6, to: 0.7, color: '#22c55e' },
  { name: 'Z3 · Tempo', from: 0.7, to: 0.8, color: '#eab308' },
  { name: 'Z4 · Limiar', from: 0.8, to: 0.9, color: '#f97316' },
  { name: 'Z5 · VO2máx', from: 0.9, to: 1.05, color: '#ef4444' },
];

/**
 * Distribui as amostras de FC nas 5 zonas clássicas (% da FC máxima).
 * Cada amostra representa `sampleIntervalSeconds` de corrida.
 */
export function calculateHeartRateZones(
  samples: HeartRateSample[] | undefined,
  maxHrBpm: number,
  sampleIntervalSeconds = 5
): HeartRateZone[] {
  const max = maxHrBpm > 0 ? maxHrBpm : 190;
  const zones: HeartRateZone[] = ZONE_DEFS.map((z, index) => ({
    index,
    name: z.name,
    minBpm: Math.round(max * z.from),
    maxBpm: Math.round(max * z.to),
    color: z.color,
    seconds: 0,
    percent: 0,
  }));

  if (!Array.isArray(samples) || samples.length === 0) return zones;

  for (const sample of samples) {
    const bpm = toFiniteNumber(sample?.bpm);
    if (bpm <= 0) continue;
    const ratio = bpm / max;
    let idx = ZONE_DEFS.findIndex((z) => ratio >= z.from && ratio < z.to);
    if (idx === -1) idx = ratio < ZONE_DEFS[0].from ? 0 : ZONE_DEFS.length - 1;
    zones[idx].seconds += sampleIntervalSeconds;
  }

  const total = zones.reduce((acc, z) => acc + z.seconds, 0);
  if (total > 0) {
    for (const zone of zones) {
      zone.percent = Math.round((zone.seconds / total) * 100);
    }
  }

  return zones;
}

export const KM_PER_MILE = 1.609344;

export function kmToMiles(km: MaybeNumber): number {
  return toFiniteNumber(km) / KM_PER_MILE;
}

export function paceMinKmToMinMile(paceMinKm: MaybeNumber): number {
  return toFiniteNumber(paceMinKm) * KM_PER_MILE;
}
