const DEFAULT_MAX_HR = 185;
const DEFAULT_RESTING_HR = 60;

export function estimateHeartRate(speedKmh, elapsedMinutes = 0, maxHr = DEFAULT_MAX_HR, restingHr = DEFAULT_RESTING_HR) {
  if (!speedKmh || speedKmh <= 0) {
    return Math.round(restingHr + (maxHr - restingHr) * 0.35);
  }

  const speedPct = Math.min(0.95, Math.max(0.25, (speedKmh - 3) / 17));
  const hrReserve = maxHr - restingHr;
  const hr = restingHr + hrReserve * speedPct;

  const drift = Math.min(0.08, elapsedMinutes * 0.002);
  return Math.round(Math.min(maxHr, hr * (1 + drift)));
}

export function estimateCadence(speedKmh) {
  if (!speedKmh || speedKmh <= 0) return 160;

  const base = 160;
  const cadence = base + (speedKmh * 1.8);
  return Math.round(Math.min(195, Math.max(145, cadence)));
}

export function calculateInstantPaceFromSpeed(speedKmh) {
  if (!speedKmh || speedKmh <= 0) return 0;
  return 60 / speedKmh;
}

export function calculateInstantSpeedFromPace(paceMinKm) {
  if (!paceMinKm || paceMinKm <= 0) return 0;
  return 60 / paceMinKm;
}

const MET_TABLE = [
  { maxSpeed: 6, met: 5.0 },
  { maxSpeed: 8, met: 6.5 },
  { maxSpeed: 10, met: 8.3 },
  { maxSpeed: 12, met: 9.8 },
  { maxSpeed: 14, met: 11.5 },
  { maxSpeed: Infinity, met: 13.5 },
];

export function smoothRollingPaces(paces, windowSize = 5) {
  if (!paces || paces.length === 0) return 0;
  if (paces.length <= windowSize) {
    return paces.reduce((a, b) => a + b, 0) / paces.length;
  }
  const recent = paces.slice(-windowSize);
  return recent.reduce((a, b) => a + b, 0) / windowSize;
}

export function getMetricConfidence(metricName, mode, hasBluetoothHr = false) {
  const confidenceMap = {
    distance: mode === 'gps' ? 'measured' : 'simulated',
    currentPace: mode === 'gps' ? 'measured' : 'simulated',
    avgPace: mode === 'gps' ? 'measured' : 'simulated',
    speed: mode === 'gps' ? 'measured' : 'simulated',
    calories: mode === 'gps' ? 'calculated' : 'simulated',
    heartRate: hasBluetoothHr ? 'measured' : 'estimated',
    cadence: 'estimated',
    splits: mode === 'gps' ? 'measured' : 'simulated',
    route: mode === 'gps' ? 'measured' : 'simulated',
  };
  return confidenceMap[metricName] || 'estimated';
}
