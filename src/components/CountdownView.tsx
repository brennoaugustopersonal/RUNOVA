import { useState, useEffect, useRef } from 'react';
import { Flame, SkipForward } from 'lucide-react';
import { soundService } from '../services/soundService';
import { triggerHaptic } from '../services/hapticService';

const START_FROM = 3;

interface CountdownViewProps {
  onComplete: () => void;
}

export function CountdownView({ onComplete }: CountdownViewProps) {
  const [count, setCount] = useState(START_FROM);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (count > 0) {
      soundService.playTone(440 + (START_FROM + 1 - count) * 100, 'sine', 0.15, 0.2);
      triggerHaptic('countdown');
      const timer = setTimeout(() => setCount((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }

    if (completedRef.current) return undefined;
    completedRef.current = true;
    triggerHaptic('success');
    soundService.playTone(880, 'triangle', 0.3, 0.3);
    onCompleteRef.current();
    return undefined;
  }, [count]);

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progress = count > 0 ? (START_FROM - count) / START_FROM : 1;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#070709] flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn"
      role="status"
      aria-live="assertive"
      aria-label={count > 0 ? `Começando em ${count}` : 'Vai!'}
    >
      <div className="absolute w-96 h-96 bg-gradient-to-tr from-[#ff6d2e]/30 to-[#ffb800]/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 space-y-6 flex flex-col items-center">
        <span className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-1 shadow-glow flex items-center justify-center">
          <span className="w-full h-full bg-[#070709] rounded-[22px] flex items-center justify-center">
            <Flame className="w-8 h-8 text-[#ff6d2e] animate-bounce-soft" aria-hidden="true" />
          </span>
        </span>

        <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">
          Prepare-se para correr
        </h2>

        <div className="relative w-[min(72vw,280px)] aspect-square flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280" aria-hidden="true">
            <defs>
              <linearGradient id="countRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff6d2e" />
                <stop offset="100%" stopColor="#ffb800" />
              </linearGradient>
            </defs>
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="6"
            />
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="url(#countRingGrad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700 ease-out"
              style={{ filter: 'drop-shadow(0 0 8px rgba(255,109,46,0.5))' }}
            />
          </svg>

          <div key={count} className="absolute inset-0 flex items-center justify-center animate-ping-once">
            <span className="text-8xl sm:text-9xl font-black text-gradient font-mono">
              {count > 0 ? count : 'GO!'}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 font-medium">
          {count > 0 ? 'Mantenha a postura e boa passada!' : 'Boa corrida! 🏃'}
        </p>

        <div className="w-32 h-1 rounded-full bg-white/5 overflow-hidden" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] transition-all duration-700 ease-out"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {count > 0 && (
          <button
            type="button"
            onClick={() => setCount(0)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
            Pular
          </button>
        )}
      </div>
    </div>
  );
}
