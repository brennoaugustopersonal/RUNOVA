const STORAGE_KEY = 'runova_runs_history_v1';

/**
 * Obtém todas as corridas salvas do localStorage.
 * Retorna array vazio se não houver dados.
 */
export function getStoredRuns() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return [];
    }
    const parsed = JSON.parse(rawData);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
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
    routePoints: Array.isArray(data.routePoints) ? data.routePoints : [],
    splits: Array.isArray(data.splits) ? data.splits : [],
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
    const updatedRuns = [runEntry, ...currentRuns];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRuns));
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
    return [];
  } catch (error) {
    return [];
  }
}
