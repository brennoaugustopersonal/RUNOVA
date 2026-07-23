const STORAGE_KEY = 'runova_runs_history_v1';

// Dados simulados de exemplo para primeira utilização
const INITIAL_MOCK_RUNS = [
  {
    id: 'run-mock-1',
    date: new Date(Date.now() - 86400000 * 4).toISOString(), // 4 dias atrás
    distanceKm: 2.1,
    targetDistanceKm: 2.1,
    durationSeconds: 780, // 13:00 min
    targetDurationSeconds: 720, // 12:00 min
    paceMinKm: 6.19, // ~6'11"
    speedKmh: 9.69,
    calories: 145,
    completedGoal: true,
  },
  {
    id: 'run-mock-2',
    date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 dias atrás
    distanceKm: 3.5,
    targetDistanceKm: 3.5,
    durationSeconds: 1215, // 20:15 min
    targetDurationSeconds: 1200, // 20:00 min
    paceMinKm: 5.78, // ~5'47"
    speedKmh: 10.37,
    calories: 240,
    completedGoal: true,
  },
  {
    id: 'run-mock-3',
    date: new Date(Date.now() - 86400000 * 1).toISOString(), // Ontem
    distanceKm: 2.1,
    targetDistanceKm: 2.1,
    durationSeconds: 732, // 12:12 min
    targetDurationSeconds: 720, // 12:00 min
    paceMinKm: 5.81, // ~5'48"
    speedKmh: 10.32,
    calories: 148,
    completedGoal: true,
  },
];

/**
 * Obtém todas as corridas salvas (ou inicializa com dados simulados)
 */
export function getStoredRuns() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_RUNS));
      return INITIAL_MOCK_RUNS;
    }
    return JSON.parse(rawData);
  } catch (error) {
    return INITIAL_MOCK_RUNS;
  }
}

/**
 * Salva uma nova corrida no histórico
 */
export function saveRun(newRunData) {
  try {
    const currentRuns = getStoredRuns();
    const runEntry = {
      id: `run-${Date.now()}`,
      date: new Date().toISOString(),
      ...newRunData,
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
