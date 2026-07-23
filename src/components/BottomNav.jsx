import React from 'react';
import { Home, History, BarChart2, Play } from 'lucide-react';

export function BottomNav({ activeTab, setActiveTab, onOpenSetup, isRunActive }) {
  if (isRunActive) return null; // Esconde barra quando corrida estiver em andamento full-screen

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2 pointer-events-none">
      <div className="max-w-md mx-auto relative pointer-events-auto flex items-center justify-between px-6 py-3 rounded-3xl glass-panel shadow-2xl border border-white/10 backdrop-blur-2xl bg-[#0e0e14]/90">
        
        {/* Tab 1: Início */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 transition-all duration-200 ${
            activeTab === 'home' ? 'text-[#ff6d2e] scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] font-semibold tracking-wide">Início</span>
        </button>

        {/* Floating Start Button (FAB) */}
        <div className="relative -top-5">
          <button
            onClick={onOpenSetup}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-1 shadow-glow hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center group"
            title="Iniciar Nova Corrida"
          >
            <div className="w-full h-full bg-[#0a0a0f] rounded-full flex items-center justify-center group-hover:bg-transparent transition-all duration-300">
              <Play className="w-6 h-6 text-[#ff6d2e] fill-[#ff6d2e] group-hover:text-white group-hover:fill-white ml-0.5 transition-colors" />
            </div>
          </button>
        </div>

        {/* Tab 2: Histórico */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-all duration-200 ${
            activeTab === 'history' ? 'text-[#ff6d2e] scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[11px] font-semibold tracking-wide">Histórico</span>
        </button>

        {/* Tab 3: Estatísticas */}
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center gap-1 transition-all duration-200 ${
            activeTab === 'stats' ? 'text-[#ff6d2e] scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[11px] font-semibold tracking-wide">Resumo</span>
        </button>

      </div>
    </div>
  );
}
