import React, { useState, useCallback, useRef } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import { bluetoothHrService } from './services/bluetoothHrService';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { QuickSummaryCard } from './components/QuickSummaryCard';
import { SetupRunModal } from './components/SetupRunModal';
import { ActiveRunView } from './components/ActiveRunView';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { HistoryView } from './components/HistoryView';
import { RunDetailsModal } from './components/RunDetailsModal';
import { PerformanceChart } from './components/PerformanceChart';
import { BadgesGrid } from './components/BadgesGrid';
import { CountdownView } from './components/CountdownView';
import { useRunHistory } from './hooks/useRunHistory';
import { useActiveRun } from './hooks/useActiveRun';

function RunDetailsModalWrapper({ runs, onClose }) {
  const { id } = useParams();
  const run = runs.find((r) => r.id === id);
  if (!run) return null;
  return <RunDetailsModal run={run} allRuns={runs} onClose={onClose} />;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [completedRunData, setCompletedRunData] = useState(null);
  const [bluetoothConnected, setBluetoothConnected] = useState(false);

  const { runs, stats, addRun, deleteRun } = useRunHistory();

  const handleRunCompleted = useCallback(
    (finalActiveRunState) => {
      const savedRun = addRun(finalActiveRunState);
      setCompletedRunData(savedRun);
    },
    [addRun]
  );

  const {
    runState,
    showCountdown,
    requestStartRun,
    handleCountdownComplete,
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
    (targetDistanceKm, targetDurationMinutes, mode) => {
      requestStartRun(targetDistanceKm, targetDurationMinutes, mode);
    },
    [requestStartRun]
  );
  const handleSelectHistoryRun = useCallback(
    (run) => navigate(`/run/${run.id}`),
    [navigate]
  );
  const handleDeleteRun = useCallback(
    (runId) => deleteRun(runId),
    [deleteRun]
  );
  const handleCloseDetails = useCallback(() => navigate(-1), [navigate]);

  const handleConnectBluetoothHr = useCallback(async () => {
    try {
      await connectBluetoothHr();
      setBluetoothConnected(true);
      bluetoothHrService.onDisconnect = () => setBluetoothConnected(false);
    } catch (e) {
      if (e.message !== 'User cancelled') {
        console.warn('Falha ao conectar Bluetooth:', e.message);
      }
      setBluetoothConnected(false);
    }
  }, [connectBluetoothHr]);

  const handleDisconnectBluetoothHr = useCallback(async () => {
    await disconnectBluetoothHr();
    setBluetoothConnected(false);
  }, [disconnectBluetoothHr]);

  const isRunActive = Boolean(
    runState &&
      (runState.status === 'running' || runState.status === 'paused')
  );

  const activeTab =
    location.pathname === '/' || location.pathname.startsWith('/run/')
      ? 'home'
      : location.pathname === '/history'
        ? 'history'
        : location.pathname === '/stats'
          ? 'stats'
          : 'home';

  const handleTabChange = useCallback(
    (tab) => {
      if (tab === 'home') navigate('/');
      else navigate(`/${tab}`);
    },
    [navigate]
  );

  const tabOrder = ['home', 'history', 'stats'];
  const touchStartRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (!touchStartRef.current) return;
      const { x: startX, y: startY } = touchStartRef.current;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = startX - endX;
      const deltaY = startY - endY;
      touchStartRef.current = null;

      if (isRunActive || showCountdown) return;

      const currentIdx = tabOrder.indexOf(activeTab);
      if (currentIdx === -1) return;

      if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          const nextIdx = (currentIdx + 1) % tabOrder.length;
          handleTabChange(tabOrder[nextIdx]);
        } else {
          const prevIdx = (currentIdx - 1 + tabOrder.length) % tabOrder.length;
          handleTabChange(tabOrder[prevIdx]);
        }
      }
    },
    [activeTab, isRunActive, showCountdown, handleTabChange]
  );

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col font-sans pb-28 select-none">
      <Header />

      <main
        className="flex-1 w-full max-w-md mx-auto px-5 pt-5 space-y-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Routes>
          <Route
            path="/"
            element={
              <div className="space-y-6 animate-fadeIn">
                <QuickSummaryCard
                  stats={stats}
                  onOpenSetup={handleOpenSetup}
                />
                <BadgesGrid runs={runs} />
                <HistoryView
                  runs={runs.slice(0, 3)}
                  onSelectRun={handleSelectHistoryRun}
                  onDeleteRun={handleDeleteRun}
                />
              </div>
            }
          />
          <Route
            path="/history"
            element={
              <div className="animate-fadeIn">
                <HistoryView
                  runs={runs}
                  onSelectRun={handleSelectHistoryRun}
                  onDeleteRun={handleDeleteRun}
                />
              </div>
            }
          />
          <Route
            path="/stats"
            element={
              <div className="space-y-6 animate-fadeIn">
                <h2 className="text-lg font-extrabold text-white">
                  Resumo e Análise Pro
                </h2>
                <QuickSummaryCard
                  stats={stats}
                  onOpenSetup={handleOpenSetup}
                />
                <BadgesGrid runs={runs} />
                {runs.length > 0 && (
                  <PerformanceChart
                    currentRun={runs[0]}
                    historyRuns={runs.slice(1)}
                  />
                )}
              </div>
            }
          />
          <Route
            path="*"
            element={
              <div className="space-y-6 animate-fadeIn">
                <QuickSummaryCard
                  stats={stats}
                  onOpenSetup={handleOpenSetup}
                />
                <BadgesGrid runs={runs} />
                <HistoryView
                  runs={runs.slice(0, 3)}
                  onSelectRun={handleSelectHistoryRun}
                  onDeleteRun={handleDeleteRun}
                />
              </div>
            }
          />
        </Routes>
      </main>

      <SetupRunModal
        isOpen={isSetupOpen}
        onClose={handleCloseSetup}
        onStartRun={handleStartRun}
      />

      {showCountdown && (
        <CountdownView onComplete={handleCountdownComplete} />
      )}

      {isRunActive && !showCountdown && (
        <ActiveRunView
          runState={runState}
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
        <SessionSummaryModal
          runData={completedRunData}
          historyRuns={runs.filter((r) => r.id !== completedRunData.id)}
          onClose={handleCloseSummary}
        />
      )}

      <Routes>
        <Route
          path="/run/:id"
          element={
            <RunDetailsModalWrapper runs={runs} onClose={handleCloseDetails} />
          }
        />
      </Routes>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenSetup={handleOpenSetup}
        isRunActive={isRunActive || showCountdown}
      />
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
