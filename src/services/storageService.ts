import type {
  ActiveRunSnapshot,
  RoutePoint,
  RunRecord,
  RunState,
  StorageWriteResult,
  UserSettings,
} from '../types/domain';

const STORAGE_KEY = 'runova_runs_history_v1';
const ACTIVE_RUN_KEY = 'runova_active_run_v1';
const SETTINGS_KEY = 'runova_settings_v1';
const MAX_ROUTE_POINTS = 5000;
const MAX_STORAGE_ITEMS = 200;
const SNAPSHOT_TTL_MS = 12 * 60 * 60 * 1000;

/**
 * Cache em memória: guarda o último raw string + array já parseado,
 * evitando JSON.parse em toda leitura (o histórico é lido a cada render).
 */
let memoryCacheRaw: string | null = null;
let memoryCache: RunRecord[] | null = null;

function safeGetItem(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function trimRoutePoints(points: unknown): RoutePoint[] {
  if (!Array.isArray(points)) return [];
  const valid = points.filter(
    (p): p is RoutePoint =>
      Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])
  );
  if (valid.length <= MAX_ROUTE_POINTS) return valid;
  const step = Math.ceil(valid.length / MAX_ROUTE_POINTS);
  return valid.filter((_, i) => i % step === 0 || i === valid.length - 1);
}

export function getStoredRuns(): RunRecord[] {
  try {
    const rawData = safeGetItem(STORAGE_KEY);
    if (memoryCache !== null && memoryCacheRaw === rawData) {
      return memoryCache;
    }
    if (!rawData) {
      memoryCacheRaw = rawData;
      memoryCache = [];
      return memoryCache;
    }
    const parsed: unknown = JSON.parse(rawData);
    memoryCacheRaw = rawData;
    memoryCache = Array.isArray(parsed) ? (parsed as RunRecord[]) : [];
    return memoryCache;
  } catch {
    memoryCacheRaw = null;
    memoryCache = [];
    return memoryCache;
  }
}

function invalidateCache(): void {
  memoryCacheRaw = null;
  memoryCache = null;
}

function toNonNegative(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Valida e normaliza os dados de uma corrida antes de persistir. */
function validateRunData(data: Partial<RunRecord> & Record<string, unknown>) {
  return {
    distanceKm: toNonNegative(data.distanceKm),
    targetDistanceKm: toNonNegative(data.targetDistanceKm),
    durationSeconds: Math.floor(toNonNegative(data.durationSeconds)),
    targetDurationSeconds: Math.floor(toNonNegative(data.targetDurationSeconds)),
    paceMinKm: toNonNegative(data.paceMinKm),
    speedKmh: toNonNegative(data.speedKmh),
    calories: Math.round(toNonNegative(data.calories)),
    completedGoal: Boolean(data.completedGoal),
    routePoints: trimRoutePoints(data.routePoints),
    splits: Array.isArray(data.splits) ? data.splits : [],
    heartRateHistory: Array.isArray(data.heartRateHistory)
      ? data.heartRateHistory.slice(-600)
      : [],
    mode: data.mode === 'gps' ? ('gps' as const) : ('simulation' as const),
    speedMultiplier: Math.max(1, Math.round(toNonNegative(data.speedMultiplier, 1))),
    elevationGainM: Math.round(toNonNegative(data.elevationGainM)),
    targetPaceMinKm: toNonNegative(data.targetPaceMinKm),
    weather: data.weather ?? null,
    locationLabel: typeof data.locationLabel === 'string' ? data.locationLabel : null,
  };
}

function writeRuns(updatedRuns: RunRecord[]): StorageWriteResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRuns));
    invalidateCache();
    return { ok: true, runs: updatedRuns };
  } catch (error) {
    const err = error as { name?: string; code?: number; message?: string };
    // Quota estourada: tenta de novo sem os dados pesados (rota + FC).
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      try {
        const stripped = updatedRuns.map((r) => ({
          ...r,
          routePoints: (r.routePoints || []).slice(0, 200),
          heartRateHistory: (r.heartRateHistory || []).slice(-100),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
        invalidateCache();
        return { ok: true, runs: stripped, warning: 'storage_trimmed' };
      } catch {
        // segue para o retorno de falha
      }
    }
    // Nunca zera o histórico da UI em caso de falha — devolve o estado anterior.
    return { ok: false, runs: getStoredRuns(), error: err?.message || 'storage_error' };
  }
}

function buildRunEntry(newRunData: Partial<RunRecord> & Record<string, unknown>): RunRecord {
  return {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    ...validateRunData(newRunData),
  } as RunRecord;
}

/**
 * Salva uma nova corrida no histórico.
 * Em caso de falha devolve a lista anterior — nunca esvazia o histórico.
 */
export function saveRun(newRunData: Partial<RunRecord> & Record<string, unknown>): RunRecord[] {
  const currentRuns = getStoredRuns();
  const updatedRuns = [buildRunEntry(newRunData), ...currentRuns].slice(0, MAX_STORAGE_ITEMS);
  const result = writeRuns(updatedRuns);
  return result.ok ? result.runs : currentRuns;
}

export interface SaveRunResult extends StorageWriteResult {
  run: RunRecord;
}

/** Igual a saveRun, mas devolve o resultado explícito para feedback na UI. */
export function saveRunWithResult(
  newRunData: Partial<RunRecord> & Record<string, unknown>
): SaveRunResult {
  const currentRuns = getStoredRuns();
  const runEntry = buildRunEntry(newRunData);
  const updatedRuns = [runEntry, ...currentRuns].slice(0, MAX_STORAGE_ITEMS);
  const result = writeRuns(updatedRuns);
  // Mesmo se a escrita falhar, a UI recebe a corrida recém-criada para exibir o resumo.
  return { ...result, run: result.ok ? (result.runs[0] ?? runEntry) : runEntry };
}

/**
 * Aplica um patch a uma corrida já salva (usado pelo enriquecimento
 * assíncrono de elevação e localização).
 */
export function updateRun(runId: string, patch: Partial<RunRecord>): RunRecord[] {
  const currentRuns = getStoredRuns();
  let changed = false;
  const updatedRuns = currentRuns.map((run) => {
    if (run.id !== runId) return run;
    changed = true;
    return { ...run, ...patch };
  });
  if (!changed) return currentRuns;
  const result = writeRuns(updatedRuns);
  return result.runs;
}

/** Remove uma corrida do histórico pelo ID. */
export function deleteRun(runId: string): RunRecord[] {
  const currentRuns = getStoredRuns();
  const updatedRuns = currentRuns.filter((run) => run.id !== runId);
  return writeRuns(updatedRuns).runs;
}

/** Limpa todo o histórico. */
export function clearStoredRuns(): RunRecord[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
    invalidateCache();
    return [];
  } catch {
    return getStoredRuns();
  }
}

/** Importa um histórico (merge por id, mantendo o mais recente primeiro). */
export function importRuns(incoming: RunRecord[]): RunRecord[] {
  if (!Array.isArray(incoming)) return getStoredRuns();
  const current = getStoredRuns();
  const byId = new Map<string, RunRecord>();
  for (const run of [...current, ...incoming]) {
    if (run && typeof run.id === 'string') byId.set(run.id, run);
  }
  const merged = Array.from(byId.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_STORAGE_ITEMS);
  return writeRuns(merged).runs;
}

// ─── Snapshot da corrida ativa (recuperação após crash) ───

export function saveActiveRunSnapshot(runState: RunState | null): boolean {
  if (!runState) return false;
  try {
    const snapshot: ActiveRunSnapshot = {
      savedAt: Date.now(),
      runState: {
        ...runState,
        routePoints: trimRoutePoints(runState.routePoints).slice(-2000),
        heartRateHistory: (runState.heartRateHistory || []).slice(-300),
      },
    };
    localStorage.setItem(ACTIVE_RUN_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function loadActiveRunSnapshot(): ActiveRunSnapshot | null {
  try {
    const raw = safeGetItem(ACTIVE_RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveRunSnapshot | null;
    if (!parsed?.runState) return null;
    if (parsed.savedAt && Date.now() - parsed.savedAt > SNAPSHOT_TTL_MS) {
      clearActiveRunSnapshot();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveRunSnapshot(): void {
  try {
    localStorage.removeItem(ACTIVE_RUN_KEY);
  } catch {
    // ignorado — armazenamento indisponível
  }
}

// ─── Configurações do usuário ───

export const DEFAULT_SETTINGS: UserSettings = {
  weightKg: 72,
  heightCm: 172,
  ageYears: 30,
  restingHrBpm: 60,
  maxHrBpm: null,
  voiceMuted: false,
  units: 'metric',
  audioCuesKm: true,
};

const SETTINGS_BOUNDS: Record<string, [number, number]> = {
  weightKg: [30, 250],
  heightCm: [100, 230],
  ageYears: [10, 100],
  restingHrBpm: [30, 110],
};

function sanitizeSettings(raw: Partial<UserSettings>): UserSettings {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  for (const [key, [min, max]] of Object.entries(SETTINGS_BOUNDS)) {
    const value = Number(merged[key as keyof UserSettings]);
    const fallback = DEFAULT_SETTINGS[key as keyof UserSettings] as number;
    (merged as Record<string, unknown>)[key] =
      Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  }
  const maxHr = Number(merged.maxHrBpm);
  merged.maxHrBpm = Number.isFinite(maxHr) && maxHr > 100 && maxHr < 230 ? maxHr : null;
  merged.units = merged.units === 'imperial' ? 'imperial' : 'metric';
  merged.voiceMuted = Boolean(merged.voiceMuted);
  merged.audioCuesKm = merged.audioCuesKm !== false;
  return merged;
}

let settingsCache: UserSettings | null = null;

export function getSettings(): UserSettings {
  if (settingsCache) return settingsCache;
  try {
    const raw = safeGetItem(SETTINGS_KEY);
    settingsCache = sanitizeSettings(raw ? (JSON.parse(raw) as Partial<UserSettings>) : {});
  } catch {
    settingsCache = { ...DEFAULT_SETTINGS };
  }
  return settingsCache;
}

export function saveSettings(partial: Partial<UserSettings>): UserSettings {
  const next = sanitizeSettings({ ...getSettings(), ...partial });
  settingsCache = next;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // mantém apenas em memória se o armazenamento falhar
  }
  return next;
}

/** Usado nos testes e ao trocar de dispositivo — descarta o cache em memória. */
export function resetSettingsCache(): void {
  settingsCache = null;
}

/** Estimativa do espaço usado pelo app no localStorage, em KB. */
export function getStorageUsageKb(): number {
  try {
    const runs = safeGetItem(STORAGE_KEY)?.length ?? 0;
    const active = safeGetItem(ACTIVE_RUN_KEY)?.length ?? 0;
    const settings = safeGetItem(SETTINGS_KEY)?.length ?? 0;
    return Math.round(((runs + active + settings) * 2) / 1024);
  } catch {
    return 0;
  }
}
