import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { QuickSummaryCard } from './components/QuickSummaryCard';
import { SetupRunModal } from './components/SetupRunModal';
import { ActiveRunView } from './components/ActiveRunView';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { HistoryView } from './components/HistoryView';
import { RunDetailsModal } from './components/RunDetailsModal';
import { PerformanceChart } from './components/PerformanceChart';
import { useRunHistory } from './hooks/useRunHistory';
import { useActiveRun } from './hooks/useActiveRun';

export function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [completedRunData, setCompletedRunData] = useState(null);
  const [selectedHistoryRun, setSelectedHistoryRun] = useState(null);

  const { runs, stats, addRun } = useRunHistory();

  // Callback acionado quando a corrida ativa é finalizada ou atinge o objetivo
  const handleRunCompleted = useCallback(
    (finalActiveRunState) => {
      const savedRun = addRun(finalActiveRunState);
      setCompletedRunData(savedRun);
    },
    [addRun]
  );

  const {
    runState,
    startRun,
    pauseRun,
    resumeRun,
    toggleSpeedMultiplier,
    finishRun,
    resetRun,
  } = useActiveRun(handleRunCompleted);

  // Inicia uma nova corrida a partir do modal de configuração
  const handleStartRun = (targetDistanceKm, targetDurationMinutes) => {
    startRun(targetDistanceKm, targetDurationMinutes);
  };

  // Fecha a tela de resumo de sessão e volta à página inicial
  const handleCloseSummary = () => {
    setCompletedRunData(null);
    resetRun();
    setActiveTab('home');
  };

  const isRunActive = Boolean(runState && runState.status !== 'idle');

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col font-sans pb-28 select-none">
      
      {/* Header Fixo */}
      <Header />

      {/* Main Content Viewport */}
      <main className="flex-1 w-full max-w-md mx-auto px-5 pt-5 space-y-6">
        
        {/* TAB 1: Início */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Card de Resumo Geral e Ação Rápida */}
            <QuickSummaryCard
              stats={stats}
              onOpenSetup={() => setIsSetupOpen(true)}
            />

            {/* Histórico Recente Rápido */}
            <HistoryView
              runs={runs.slice(0, 3)}
              onSelectRun={(run) => setSelectedHistoryRun(run)}
            />
          </div>
        )}

        {/* TAB 2: Histórico Completo */}
        {activeTab === 'history' && (
          <div className="animate-fadeIn">
            <HistoryView
              runs={runs}
              onSelectRun={(run) => setSelectedHistoryRun(run)}
            />
          </div>
        )}

        {/* TAB 3: Resumo & Comparativos de Estatísticas */}
        {activeTab === 'stats' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-lg font-extrabold text-white">Resumo e Análise de Desempenho</h2>
            <QuickSummaryCard stats={stats} onOpenSetup={() => setIsSetupOpen(true)} />
            {runs.length > 0 && (
              <PerformanceChart currentRun={runs[0]} historyRuns={runs.slice(1)} />
            )}
          </div>
        )}

      </main>

      {/* Modal de Configuração da Corrida (Distância e Tempo) */}
      <SetupRunModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        onStartRun={handleStartRun}
      />

      {/* Tela Full-Screen da Corrida Ativa com Telemetria em Tempo Real */}
      {isRunActive && (
        <ActiveRunView
          runState={runState}
          onPause={pauseRun}
          onResume={resumeRun}
          onFinish={finishRun}
          onToggleSpeed={toggleSpeedMultiplier}
        />
      )}

      {/* Modal de Conclusão de Corrida com Gráfico Comparativo */}
      {completedRunData && (
        <SessionSummaryModal
          runData={completedRunData}
          historyRuns={runs.filter((r) => r.id !== completedRunData.id)}
          onClose={handleCloseSummary}
        />
      )}

      {/* Modal de Detalhes da Corrida do Histórico */}
      {selectedHistoryRun && (
        <RunDetailsModal
          run={selectedHistoryRun}
          allRuns={runs}
          onClose={() => setSelectedHistoryRun(null)}
        />
      )}

      {/* Navegação Inferior Fixa Thumb-Friendly */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSetup={() => setIsSetupOpen(true)}
        isRunActive={isRunActive}
      />

    </div>
  );
}

export default App;
