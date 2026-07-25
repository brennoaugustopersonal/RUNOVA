import { memo, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  History,
  Navigation,
  Clock,
  ChevronRight,
  ChevronDown,
  Trash2,
  Search,
  Download,
  Gamepad2,
  MapPin,
} from 'lucide-react';
import {
  formatTime,
  formatPace,
  formatDistance,
  formatDate,
  distanceUnitLabel,
} from '../utils/formatters';
import { downloadCsv, downloadJson } from '../utils/download';
import { ConfirmDialog } from './ConfirmDialog';
import type { RunRecord, UnitSystem } from '../types/domain';

const PAGE_SIZE = 10;

const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'goal', label: 'Meta alcançada' },
  { key: 'gps', label: 'GPS' },
  { key: 'simulation', label: 'Simulação' },
] as const;

const SORT_OPTIONS = [
  { key: 'newest', label: 'Mais recentes' },
  { key: 'farthest', label: 'Mais longas' },
  { key: 'fastest', label: 'Mais rápidas' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];
type SortKey = (typeof SORT_OPTIONS)[number]['key'];

interface HistoryViewProps {
  runs?: RunRecord[];
  units?: UnitSystem;
  onSelectRun: (run: RunRecord) => void;
  onDeleteRun?: (runId: string) => void;
  showTools?: boolean;
}

function HistoryViewFn({
  runs = [],
  units = 'metric',
  onSelectRun,
  onDeleteRun,
  showTools = true,
}: HistoryViewProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [searchText, setSearchText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<RunRecord | null>(null);
  const sentinelRef = useRef<HTMLButtonElement>(null);
  const unit = distanceUnitLabel(units);

  const sortedRuns = useMemo(() => {
    let result = runs;

    if (activeFilter === 'goal') result = result.filter((r) => r.completedGoal === true);
    else if (activeFilter === 'gps') result = result.filter((r) => r.mode === 'gps');
    else if (activeFilter === 'simulation')
      result = result.filter((r) => !r.mode || r.mode === 'simulation');

    const query = searchText.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (r) =>
          formatDate(r.date).toLowerCase().includes(query) ||
          String(r.distanceKm ?? '').includes(query) ||
          (r.mode || '').toLowerCase().includes(query) ||
          (r.locationLabel || '').toLowerCase().includes(query)
      );
    }

    const list = [...result];
    if (sortBy === 'farthest') list.sort((a, b) => b.distanceKm - a.distanceKm);
    else if (sortBy === 'fastest') list.sort((a, b) => a.paceMinKm - b.paceMinKm);
    else list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return list;
  }, [runs, activeFilter, searchText, sortBy]);

  const visibleRuns = sortedRuns.slice(0, visibleCount);
  const hasMore = visibleCount < sortedRuns.length;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || typeof IntersectionObserver === 'undefined') return undefined;

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

  // Qualquer mudança de filtro reinicia a paginação.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeFilter, sortBy, searchText]);

  const exportCsv = useCallback(() => {
    const header = [
      'Data',
      `Distância (${unit})`,
      'Duração (s)',
      `Ritmo (min/${unit})`,
      'Calorias',
      'Elevação (m)',
      'Meta atingida',
      'Modo',
      'Local',
    ];
    const rows = sortedRuns.map((run) => [
      formatDate(run.date),
      formatDistance(run.distanceKm, 2, units),
      run.durationSeconds,
      formatPace(run.paceMinKm, units),
      run.calories,
      run.elevationGainM ?? 0,
      run.completedGoal ? 'Sim' : 'Não',
      run.mode ?? 'simulation',
      run.locationLabel ?? '',
    ]);
    downloadCsv([header, ...rows], `runova-corridas-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [sortedRuns, unit, units]);

  const exportJson = useCallback(() => {
    downloadJson(sortedRuns, `runova-corridas-${new Date().toISOString().slice(0, 10)}.json`);
  }, [sortedRuns]);

  if (runs.length === 0) {
    return (
      <div className="py-12 text-center space-y-3">
        <span className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
          <History className="w-6 h-6" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-slate-300">Nenhuma corrida registrada ainda</p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          Inicie sua primeira sessão para acompanhar histórico, splits e comparativos de
          desempenho.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4 pb-4" aria-label="Histórico de corridas">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-white">
          <History className="w-5 h-5 text-[#ff6d2e]" aria-hidden="true" />
          Histórico
        </h2>
        <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10 whitespace-nowrap">
          {runs.length} {runs.length === 1 ? 'sessão' : 'sessões'}
        </span>
      </div>

      {showTools && (
        <>
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={activeFilter === f.key}
                onClick={() => setActiveFilter(f.key)}
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

          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar data, km, local…"
                aria-label="Buscar corridas"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#ff6d2e]/50 transition-colors"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Ordenar corridas"
              className="px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 focus:outline-none focus:border-[#ff6d2e]/50 transition-colors"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key} className="bg-slate-900">
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportCsv}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
              aria-label="Exportar como CSV"
              title="Exportar CSV (Excel)"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-[#ffb800] hover:border-[#ffb800]/30 transition-colors"
              aria-label="Exportar como JSON"
              title="Exportar JSON (backup)"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {sortedRuns.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          Nenhuma corrida encontrada para este filtro.
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {visibleRuns.map((run) => (
              <li key={run.id}>
                <div className="p-4 rounded-2xl glass-panel-interactive border border-white/5 flex items-center justify-between gap-2 group">
                  <button
                    type="button"
                    onClick={() => onSelectRun(run)}
                    className="flex items-center gap-3.5 min-w-0 flex-1 text-left"
                    aria-label={`Ver detalhes da corrida de ${formatDistance(run.distanceKm, 2, units)} ${unit} em ${formatDate(run.date)}`}
                  >
                    <span className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-tr from-[#ff6d2e]/20 to-[#ffb800]/20 border border-[#ff6d2e]/30 flex items-center justify-center text-[#ff6d2e]">
                      {run.mode === 'gps' ? (
                        <Navigation className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <Gamepad2 className="w-5 h-5" aria-hidden="true" />
                      )}
                    </span>

                    <span className="space-y-0.5 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-white font-mono">
                          {formatDistance(run.distanceKm, 2, units)}{' '}
                          <span className="text-xs text-[#ff6d2e]">{unit}</span>
                        </span>
                        {run.completedGoal && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                            Meta
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                        {formatDate(run.date)}
                        {run.locationLabel && (
                          <>
                            <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                            <span className="truncate">{run.locationLabel}</span>
                          </>
                        )}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right space-y-0.5">
                      <p className="flex items-center justify-end gap-1 text-xs font-mono font-bold text-slate-200">
                        <Clock className="w-3 h-3 text-[#ffb800]" aria-hidden="true" />
                        {formatTime(run.durationSeconds)}
                      </p>
                      <p className="flex items-center justify-end gap-1.5 text-[11px] text-slate-400 font-mono">
                        <span>
                          {formatPace(run.paceMinKm, units)}/{unit}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span className="text-orange-400">{run.calories} kcal</span>
                      </p>
                    </div>

                    {onDeleteRun && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(run)}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-all touch-manipulation"
                        aria-label={`Excluir corrida de ${formatDate(run.date)}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}

                    <ChevronRight
                      className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              ref={sentinelRef}
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
              className="w-full py-3 rounded-2xl glass-panel-interactive border border-white/5 text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
              Carregar mais ({sortedRuns.length - visibleCount} restantes)
            </button>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Excluir corrida?"
        message={
          pendingDelete
            ? `A sessão de ${formatDistance(pendingDelete.distanceKm, 2, units)} ${unit} em ${formatDate(pendingDelete.date)} será removida permanentemente deste dispositivo.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={() => {
          if (pendingDelete) onDeleteRun?.(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </section>
  );
}

export const HistoryView = memo(HistoryViewFn);
