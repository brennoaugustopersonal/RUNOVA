import { useRef, useEffect, useState, useCallback } from 'react';
import { Home, History, BarChart2, Play } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { triggerHaptic } from '../services/hapticService';

export type TabKey = 'home' | 'history' | 'stats';

const TAB_ITEMS: TabKey[] = ['home', 'history', 'stats'];
const TAB_ICONS: Record<TabKey, LucideIcon> = { home: Home, history: History, stats: BarChart2 };
const TAB_LABELS: Record<TabKey, string> = {
  home: 'Início',
  history: 'Histórico',
  stats: 'Resumo',
};

interface BottomNavProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  onOpenSetup: () => void;
  isRunActive: boolean;
}

export function BottomNav({ activeTab, setActiveTab, onOpenSetup, isRunActive }: BottomNavProps) {
  // Todos os hooks vêm antes de qualquer retorno antecipado — do contrário
  // React quebra com "Rendered fewer hooks than expected" ao iniciar a corrida.
  const tabsRef = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(
    null
  );

  useEffect(() => {
    if (isRunActive) return undefined;

    const update = () => {
      const el = tabsRef.current[activeTab];
      if (el) setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    };
    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [activeTab, isRunActive]);

  const handleTabClick = useCallback(
    (tab: TabKey) => {
      triggerHaptic('light');
      setActiveTab(tab);
    },
    [setActiveTab]
  );

  const handleStartClick = useCallback(() => {
    triggerHaptic('medium');
    onOpenSetup();
  }, [onOpenSetup]);

  if (isRunActive) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 pointer-events-none"
      aria-label="Navegação principal"
    >
      <div className="max-w-md mx-auto relative pointer-events-auto grid grid-cols-4 items-center gap-1 px-3 py-2 rounded-3xl glass-panel shadow-2xl border border-white/10 backdrop-blur-2xl bg-[#0e0e14]/95">
        {indicatorStyle && (
          <div
            className="absolute top-0 h-[3px] rounded-full bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={indicatorStyle}
            aria-hidden="true"
          />
        )}

        {TAB_ITEMS.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              ref={(el) => {
                tabsRef.current[tab] = el;
              }}
              onClick={() => handleTabClick(tab)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 min-h-[48px] transition-colors duration-200 touch-manipulation ${
                isActive ? 'text-[#ff6d2e]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                aria-hidden="true"
              />
              <span className="text-[11px] font-semibold tracking-wide">{TAB_LABELS[tab]}</span>
            </button>
          );
        })}

        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleStartClick}
            className="w-14 h-14 -mt-7 rounded-full bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-1 shadow-glow hover:scale-105 active:scale-95 transition-transform duration-200 flex items-center justify-center group touch-manipulation"
            aria-label="Iniciar nova corrida"
          >
            <span className="w-full h-full bg-[#0a0a0f] rounded-full flex items-center justify-center group-hover:bg-transparent transition-colors duration-300">
              <Play
                className="w-6 h-6 text-[#ff6d2e] fill-[#ff6d2e] group-hover:text-white group-hover:fill-white ml-0.5 transition-colors"
                aria-hidden="true"
              />
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
