import { useState, useCallback, useRef, useEffect, lazy, Suspense, useMemo } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import { WifiOff, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { bluetoothHrService } from './services/bluetoothHrService';
import { resolveMaxHeartRate } from './services/physioEstimation';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import type { TabKey } from './components/BottomNav';
import { QuickSummaryCard } from './components/QuickSummaryCard';
import { SetupRunModal } from './components/SetupRunModal';
import { ActiveRunView } from './components/ActiveRunView';
import { HistoryView } from './components/HistoryView';
import { CountdownView } from './components/CountdownView';
import { PerformanceChart } from './components/PerformanceChart';
import { ConfirmDialog } from './components/ConfirmDialog';
import { useRunHistory } from './hooks/useRunHistory';
import { useActiveRun } from './hooks/useActiveRun';
import { useSettings } from './hooks/useSettings';
import type { RunRecord, RunMode, UnitSystem } from './types/domain';

const RunDetailsModal = lazy(() =>
  import('./components/RunDetailsModal').then((m) => ({ default: m.RunDetailsModal }))
);
// Modais pesados só entram no bundle quando realmente abertos.
const SessionSummaryModal = lazy(() =>
  import('./components/SessionSummaryModal').then((m) => ({ default: m.SessionSummaryModal }))
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const BadgesGrid = lazy(() =>
  import('./components/BadgesGrid').then((m) => ({ default: m.BadgesGrid }))
);
const PersonalRecordsCard = lazy(() =>
  import('./components/PersonalRecordsCard').then((m) => ({ default: m.PersonalRecordsCard }))
);
const WeeklyVolumeChart = lazy(() =>
  import('./components/WeeklyVolumeChart').then((m) => ({ default: m.WeeklyVolumeChart }))
);

const TAB_ORDER: TabKey[] = ['home', 'history', 'stats'];
const SWIPE_MIN_DISTANCE = 60;

function Skeleton({ height }: { height: string }) {
  return <div className={`${height} skeleton-shimmer`} aria-hidden="true" />;
}

function RunDetailsRoute({
  runs,
  units,
  maxHrBpm,
  onClose,
}: {
  runs: RunRecord[];
  units: UnitSystem;
  maxHrBpm: number;
  onClose: () => void;
}) {
  const { id } = useParams();
  const run = runs.find((r) => r.id === id) ?? null;
  if (!run) return null;
  return (
    <Suspense fallback={null}>
      <RunDetailsModal
        run={run}
        allRuns={runs}
        units={units}
        maxHrBpm={maxHrBpm}
        onClose={onClose}
      />
    </Suspense>
  );
}

function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/95 text-slate-950 text-xs font-bold safe-top animate-slideDown"
    >
      <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Sem conexão — GPS, histórico e corridas continuam funcionando</span>
    </div>
  );
}

function PwaUpdateToast() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { registerSW } = await import('virtual:pwa-register');
        const updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            if (!cancelled) setNeedRefresh(true);
          },
        });
        updateSWRef.current = updateSW;
      } catch {
        // plugin PWA ausente em dev/testes
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-28 left-4 right-4 z-[55] max-w-md mx-auto animate-slideUp">
      <div className="glass-panel border border-[#ff6d2e]/30 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-glow">
        <p className="text-xs font-semibold text-slate-200">Nova versão disponível</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void updateSWRef.current?.(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 text-xs font-extrabold"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => setNeedRefresh(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            aria-label="Dispensar aviso de atualização"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StorageErrorToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="fixed bottom-28 left-4 right-4 z-[56] max-w-md mx-auto animate-slideUp">
      <div className="glass-panel border border-amber-500/30 rounded-2xl p-3 flex items-start gap-2.5 shadow-glow">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="flex-1 text-xs font-semibold text-slate-200 leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white shrink-0"
          aria-label="Dispensar aviso"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ResumeRunBanner({
  distanceKm,
  elapsedSeconds,
  onResume,
  onDiscard,
}: {
  distanceKm: number;
  elapsedSeconds: number;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="rounded-2xl p-4 glass-panel border border-amber-500/30 bg-amber-500/5 space-y-3 animate-fadeIn">
      <div className="flex items-start gap-3">
        <span className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25 shrink-0">
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold text-white">Corrida interrompida</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {distanceKm.toFixed(2)} km · {Math.floor(elapsedSeconds / 60)} min — restaurar e
            continuar?
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onResume}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 text-xs font-extrabold"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [completedRunData, setCompletedRunData] = useState<RunRecord | null>(null);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);

  const { settings, updateSettings } = useSettings();
  const {
    runs,
    stats,
    addRun,
    deleteRun,
    importHistory,
    clearHistory,
    storageError,
    dismissStorageError,
  } = useRunHistory();

  const maxHrBpm = useMemo(
    () => resolveMaxHeartRate(settings.ageYears, settings.maxHrBpm),
    [settings.ageYears, settings.maxHrBpm]
  );

  const handleRunCompleted = useCallback(
    (finalState: Parameters<typeof addRun>[0]) => {
      setCompletedRunData(addRun(finalState));
    },
    [addRun]
  );

  const {
    runState,
    showCountdown,
    resumeAvailable,
    requestStartRun,
    handleCountdownComplete,
    resumeInterruptedRun,
    discardInterruptedRun,
    pauseRun,
    resumeRun,
    toggleSpeedMultiplier,
    finishRun,
    resetRun,
    connectBluetoothHr,
    disconnectBluetoothHr,
  } = useActiveRun(handleRunCompleted);

  const handleOpenSetup = useCallback(() => setIsSetupOpen(true), []);
  const handleCloseSetup = useCallback(() => setIsSetupOpen(false), []);

  const handleCloseSummary = useCallback(() => {
    setCompletedRunData(null);
    resetRun();
    navigate('/');
  }, [resetRun, navigate]);

  const handleStartRun = useCallback(
    (targetDistanceKm: number, targetDurationMinutes: number, mode: RunMode) => {
      requestStartRun(targetDistanceKm, targetDurationMinutes, mode);
    },
    [requestStartRun]
  );

  const handleSelectHistoryRun = useCallback(
    (run: RunRecord) => navigate(`/run/${run.id}`),
    [navigate]
  );
  const handleCloseDetails = useCallback(() => navigate(-1), [navigate]);

  const handleConnectBluetoothHr = useCallback(async () => {
    try {
      await connectBluetoothHr();
      setBluetoothConnected(true);
      bluetoothHrService.onDisconnect = () => setBluetoothConnected(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!message.includes('cancel') && !message.includes('User')) {
        console.warn('Bluetooth HR:', message);
      }
      setBluetoothConnected(false);
    }
  }, [connectBluetoothHr]);

  const handleDisconnectBluetoothHr = useCallback(async () => {
    await disconnectBluetoothHr();
    setBluetoothConnected(false);
  }, [disconnectBluetoothHr]);

  const isRunActive =
    runState?.status === 'running' || runState?.status === 'paused';

  const activeTab: TabKey =
    location.pathname === '/history'
      ? 'history'
      : location.pathname === '/stats'
        ? 'stats'
        : 'home';

  const handleTabChange = useCallback(
    (tab: TabKey) => navigate(tab === 'home' ? '/' : `/${tab}`),
    [navigate]
  );

  // Navegação por gesto entre abas (apenas quando não há corrida em andamento)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || isRunActive || showCountdown) return;

      const touch = e.changedTouches[0];
      const deltaX = start.x - touch.clientX;
      const deltaY = start.y - touch.clientY;

      // Exige movimento claramente horizontal para não conflitar com o scroll
      if (Math.abs(deltaX) < SWIPE_MIN_DISTANCE || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) {
        return;
      }

      const currentIdx = TAB_ORDER.indexOf(activeTab);
      if (currentIdx === -1) return;
      const nextIdx =
        deltaX > 0
          ? (currentIdx + 1) % TAB_ORDER.length
          : (currentIdx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      handleTabChange(TAB_ORDER[nextIdx]);
    },
    [activeTab, isRunActive, showCountdown, handleTabChange]
  );

  const homeView = (
    <div className="space-y-6 animate-fadeIn page-transition">
      <QuickSummaryCard stats={stats} units={settings.units} onOpenSetup={handleOpenSetup} />
      <Suspense fallback={<Skeleton height="h-24" />}>
        <BadgesGrid runs={runs} />
      </Suspense>
      <HistoryView
        runs={runs.slice(0, 3)}
        units={settings.units}
        onSelectRun={handleSelectHistoryRun}
        onDeleteRun={deleteRun}
        showTools={false}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col font-sans pb-28 select-none">
      <OfflineBanner />
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <main
        className="flex-1 w-full max-w-md mx-auto px-5 pt-5 space-y-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {resumeAvailable && !isRunActive && !showCountdown && (
          <ResumeRunBanner
            distanceKm={resumeAvailable.runState.currentDistanceKm ?? 0}
            elapsedSeconds={resumeAvailable.runState.elapsedSeconds ?? 0}
            onResume={resumeInterruptedRun}
            onDiscard={discardInterruptedRun}
          />
        )}

        <Routes>
          <Route path="/" element={homeView} />
          <Route path="/run/:id" element={homeView} />
          <Route
            path="/history"
            element={
              <div className="animate-fadeIn page-transition">
                <HistoryView
                  runs={runs}
                  units={settings.units}
                  onSelectRun={handleSelectHistoryRun}
                  onDeleteRun={deleteRun}
                />
              </div>
            }
          />
          <Route
            path="/stats"
            element={
              <div className="space-y-6 animate-fadeIn page-transition">
                <h2 className="text-lg font-extrabold text-white">Resumo e análise</h2>
                {runs.length === 0 ? (
                  <div className="rounded-3xl p-8 glass-panel border border-white/10 text-center space-y-3">
                    <p className="text-sm text-slate-400">
                      Complete sua primeira corrida para ver análises e gráficos.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenSetup}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 text-xs font-extrabold"
                    >
                      Configurar corrida
                    </button>
                  </div>
                ) : (
                  <>
                    <QuickSummaryCard
                      stats={stats}
                      units={settings.units}
                      onOpenSetup={handleOpenSetup}
                    />
                    <Suspense fallback={<Skeleton height="h-40" />}>
                      <WeeklyVolumeChart runs={runs} units={settings.units} />
                    </Suspense>
                    <Suspense fallback={<Skeleton height="h-40" />}>
                      <PersonalRecordsCard runs={runs} units={settings.units} />
                    </Suspense>
                    <Suspense fallback={<Skeleton height="h-24" />}>
                      <BadgesGrid runs={runs} />
                    </Suspense>
                    <PerformanceChart
                      currentRun={runs[0]}
                      historyRuns={runs.slice(1)}
                      units={settings.units}
                    />
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed px-2">
                      Calorias, FC e VO₂máx são estimativas orientativas e não substituem avaliação
                      médica. Os dados ficam apenas neste dispositivo.
                    </p>
                  </>
                )}
              </div>
            }
          />
          <Route path="*" element={homeView} />
        </Routes>
      </main>

      <SetupRunModal
        isOpen={isSetupOpen}
        units={settings.units}
        onClose={handleCloseSetup}
        onStartRun={handleStartRun}
      />

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            settings={settings}
            runs={runs}
            onClose={() => setIsSettingsOpen(false)}
            onUpdate={updateSettings}
            onImport={importHistory}
            onClearHistory={() => setConfirmClear(true)}
          />
        </Suspense>
      )}

      <ConfirmDialog
        isOpen={confirmClear}
        title="Apagar todo o histórico?"
        message={`As ${runs.length} corridas salvas neste dispositivo serão removidas permanentemente. Exporte um backup antes se quiser mantê-las.`}
        confirmLabel="Apagar tudo"
        onConfirm={() => {
          clearHistory();
          setConfirmClear(false);
          setIsSettingsOpen(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />

      {showCountdown && <CountdownView onComplete={handleCountdownComplete} />}

      {isRunActive && !showCountdown && (
        <ActiveRunView
          runState={runState}
          units={settings.units}
          onPause={pauseRun}
          onResume={resumeRun}
          onFinish={finishRun}
          onToggleSpeed={toggleSpeedMultiplier}
          onConnectBluetoothHr={handleConnectBluetoothHr}
          onDisconnectBluetoothHr={handleDisconnectBluetoothHr}
          bluetoothConnected={bluetoothConnected}
        />
      )}

      {completedRunData && (
        <Suspense fallback={null}>
          <SessionSummaryModal
            runData={completedRunData}
            historyRuns={runs.filter((r) => r.id !== completedRunData.id)}
            units={settings.units}
            maxHrBpm={maxHrBpm}
            onClose={handleCloseSummary}
          />
        </Suspense>
      )}

      {/* Overlay de detalhes: vive fora do <main> para cobrir a tela inteira.
          O catch-all evita o aviso "No routes matched location" nas demais rotas. */}
      <Routes>
        <Route
          path="/run/:id"
          element={
            <RunDetailsRoute
              runs={runs}
              units={settings.units}
              maxHrBpm={maxHrBpm}
              onClose={handleCloseDetails}
            />
          }
        />
        <Route path="*" element={null} />
      </Routes>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenSetup={handleOpenSetup}
        isRunActive={isRunActive || showCountdown}
      />

      {storageError && (
        <StorageErrorToast message={storageError} onDismiss={dismissStorageError} />
      )}
      <PwaUpdateToast />
    </div>
  );
}

export function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
