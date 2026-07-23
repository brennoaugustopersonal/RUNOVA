const STORAGE_KEY = 'runova_runs_history_v1';
const MAX_ROUTE_POINTS = 5000;
const MAX_STORAGE_ITEMS = 200;

/** Cache em memória: armazena o último raw string + parsed array
 *  para evitar JSON.parse em toda leitura.
 *  Usa comparação de string crua para detectar mudanças externas
 *  (ex.: testes que manipulam localStorage diretamente).
 */
let memoryCacheRaw = null;
let memoryCache = null;

function trimRoutePoints(points) {
  if (!Array.isArray(points) || points.length <= MAX_ROUTE_POINTS) return points;
  const step = Math.ceil(points.length / MAX_ROUTE_POINTS);
  return points.filter((_, i) => i % step === 0);
}

export function getStoredRuns() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    // Se cache existe e raw string não mudou, usa cache
    if (memoryCache !== null && memoryCacheRaw === rawData) {
      return memoryCache;
    }
    if (!rawData) {
      memoryCacheRaw = rawData;
      memoryCache = [];
      return [];
    }
    const parsed = JSON.parse(rawData);
    memoryCacheRaw = rawData;
    memoryCache = Array.isArray(parsed) ? parsed : [];
    return memoryCache;
  } catch (error) {
    memoryCacheRaw = null;
    memoryCache = [];
    return [];
  }
}

function invalidateCache() {
  memoryCacheRaw = null;
  memoryCache = null;
}

/**
 * Valida e normaliza dados de uma corrida antes de salvar
 */
function validateRunData(data) {
  return {
    distanceKm: Math.max(0, Number(data.distanceKm) || 0),
    targetDistanceKm: Math.max(0, Number(data.targetDistanceKm) || 0),
    durationSeconds: Math.max(0, Math.floor(Number(data.durationSeconds) || 0)),
    targetDurationSeconds: Math.max(0, Math.floor(Number(data.targetDurationSeconds) || 0)),
    paceMinKm: Math.max(0, Number(data.paceMinKm) || 0),
    speedKmh: Math.max(0, Number(data.speedKmh) || 0),
    calories: Math.max(0, Math.round(Number(data.calories) || 0)),
    completedGoal: Boolean(data.completedGoal),
    routePoints: trimRoutePoints(Array.isArray(data.routePoints) ? data.routePoints : []),
    splits: Array.isArray(data.splits) ? data.splits : [],
    heartRateHistory: Array.isArray(data.heartRateHistory) ? data.heartRateHistory.slice(-600) : [],
    mode: data.mode || 'simulation',
    speedMultiplier: Math.max(1, Math.round(Number(data.speedMultiplier) || 1)),
  };
}

/**
 * Salva uma nova corrida no histórico
 */
export function saveRun(newRunData) {
  try {
    const currentRuns = getStoredRuns();
    const runEntry = {
      id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: new Date().toISOString(),
      ...validateRunData(newRunData),
    };
    const updatedRuns = [runEntry, ...currentRuns].slice(0, MAX_STORAGE_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRuns));
    invalidateCache();
    return updatedRuns;
  } catch (error) {
    return [];
  }
}

/**
 * Remove uma corrida do histórico pelo ID
 */
export function deleteRun(runId) {
  try {
    const currentRuns = getStoredRuns();
    const updatedRuns = currentRuns.filter(run => run.id !== runId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRuns));
    invalidateCache();
    return updatedRuns;
  } catch (error) {
    return [];
  }
}

/**
 * Limpa todo o histórico (opcional para testes)
 */
export function clearStoredRuns() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    invalidateCache();
    return [];
  } catch (error) {
    return [];
  }
}
