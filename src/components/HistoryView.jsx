import React, { useState, useMemo, useEffect, useRef } from 'react';
import { History, Navigation, Clock, ChevronRight, ChevronDown, Trash2, Search, Download } from 'lucide-react';
import { formatTime, formatPace, formatDistance, formatDate } from '../utils/formatters';

const PAGE_SIZE = 10;

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'goal', label: 'Meta Alcançada' },
  { key: 'gps', label: 'GPS' },
  { key: 'simulation', label: 'Simulação' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Mais Recentes' },
  { key: 'farthest', label: 'Mais Distantes' },
  { key: 'fastest', label: 'Mais Rápidos' },
];

function HistoryViewFn({ runs = [], onSelectRun, onDeleteRun = () => {} }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchText, setSearchText] = useState('');
  const sentinelRef = useRef(null);

  const filteredRuns = useMemo(() => {
    let result = runs;

    if (activeFilter === 'goal') {
      result = result.filter(r => r.completedGoal === true);
    } else if (activeFilter === 'gps') {
      result = result.filter(r => r.mode === 'gps');
    } else if (activeFilter === 'simulation') {
      result = result.filter(r => !r.mode || r.mode === 'simulation');
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(r => formatDate(r.date).toLowerCase().includes(q));
    }

    return result;
  }, [runs, activeFilter, searchText]);

  const sortedRuns = useMemo(() => {
    const list = [...filteredRuns];
    if (sortBy === 'farthest') {
      list.sort((a, b) => b.distanceKm - a.distanceKm);
    } else if (sortBy === 'fastest') {
      list.sort((a, b) => a.paceMinKm - b.paceMinKm);
    } else {
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    return list;
  }, [filteredRuns, sortBy]);

  const visibleRuns = sortedRuns.slice(0, visibleCount);
  const hasMore = visibleCount < sortedRuns.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, sortedRuns.length));
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, sortedRuns.length]);

  function resetPagination() {
    setVisibleCount(PAGE_SIZE);
  }

  function handleFilterChange(key) {
    setActiveFilter(key);
    resetPagination();
  }

  function handleSortChange(e) {
    setSortBy(e.target.value);
    resetPagination();
  }

  function handleSearchChange(e) {
    setSearchText(e.target.value);
    resetPagination();
  }

  function exportCSV() {
    const headers = ['Data', 'Distância (km)', 'Duração (s)', 'Ritmo (min/km)', 'Calorias', 'Meta Atingida', 'Modo'];
    const rows = runs.map(run => [
      `"${formatDate(run.date)}"`,
      run.distanceKm,
      run.durationSeconds,
      run.paceMinKm,
      run.calories,
      run.completedGoal ? 'Sim' : 'Não',
      run.mode || 'simulation',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encoded = encodeURIComponent(csv);
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encoded}`;
    link.download = `corridas-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportJSON() {
    const json = JSON.stringify(runs, null, 2);
    const encoded = encodeURIComponent(json);
    const link = document.createElement('a');
    link.href = `data:application/json;charset=utf-8,${encoded}`;
    link.download = `corridas-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleDelete(e, runId) {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir esta corrida?')) {
      onDeleteRun(runId);
    }
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
          <History className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-300">Nenhuma corrida registrada ainda</p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Inicie sua primeira sessão para visualizar seu histórico e comparativos de desempenho.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#ff6d2e]" />
          <h2 className="text-base font-extrabold text-white">Histórico de Corridas</h2>
        </div>
        <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
          {runs.length} sessões
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === f.key
                ? 'bg-[#ff6d2e]/20 text-[#ff6d2e] border border-[#ff6d2e]/30'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + Sort + Export */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchText}
            onChange={handleSearchChange}
            placeholder="Buscar por data..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#ff6d2e]/50 transition-colors"
          />
        </div>
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 focus:outline-none focus:border-[#ff6d2e]/50 transition-colors"
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key} className="bg-slate-900">{opt.label}</option>
          ))}
        </select>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all text-xs font-bold"
          title="Exportar dados como CSV (planilha)"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">CSV</span>
        </button>
        <button
          onClick={exportJSON}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-[#ffb800] hover:border-[#ffb800]/30 transition-all text-xs font-bold"
          title="Exportar dados como JSON (desenvolvedor)"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">JSON</span>
        </button>
      </div>

      {/* Filtered empty state */}
      {sortedRuns.length === 0 ? (
        <div className="py-8 text-center space-y-2">
          <p className="text-sm text-slate-400">Nenhuma corrida encontrada para este filtro</p>
        </div>
      ) : (
        <>
          {/* Lista de Corridas */}
          <div className="space-y-3">
            {visibleRuns.map((run) => (
              <div
                key={run.id}
                onClick={() => onSelectRun(run)}
                className="p-4 rounded-2xl glass-panel-interactive border border-white/5 flex items-center justify-between cursor-pointer group"
              >
                {/* Lado Esquerdo */}
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#ff6d2e]/20 to-[#ffb800]/20 border border-[#ff6d2e]/30 flex items-center justify-center text-[#ff6d2e]">
                    <Navigation className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white font-mono">
                        {formatDistance(run.distanceKm, 2)} <span className="text-xs text-[#ff6d2e]">km</span>
                      </span>
                      {run.completedGoal && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          Meta ⚡
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400">
                      {formatDate(run.date)}
                    </p>
                  </div>
                </div>

                {/* Lado Direito */}
                <div className="flex items-center gap-3">
                  <div className="text-right space-y-0.5">
                    <div className="flex items-center justify-end gap-1 text-xs font-mono font-bold text-slate-200">
                      <Clock className="w-3 h-3 text-[#ffb800]" />
                      <span>{formatTime(run.durationSeconds)}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400 font-mono">
                      <span>{formatPace(run.paceMinKm)}/km</span>
                      <span>•</span>
                      <span className="text-orange-400">{run.calories} kcal</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, run.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    title="Excluir corrida"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              ref={sentinelRef}
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="w-full py-3 rounded-2xl glass-panel-interactive border border-white/5 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <ChevronDown className="w-4 h-4" />
              Carregar Mais ({sortedRuns.length - visibleCount} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
}

export const HistoryView = React.memo(HistoryViewFn);
