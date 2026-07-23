import React, { useState, useEffect, useRef } from 'react';
import { Flame } from 'lucide-react';
import { soundService } from '../services/soundService';
import { triggerHaptic } from '../services/hapticService';

export function CountdownView({ onComplete }) {
  const [count, setCount] = useState(3);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (count > 0) {
      soundService.playTone(440 + (4 - count) * 100, 'sine', 0.15, 0.2);
      triggerHaptic('countdown');

      const timer = setTimeout(() => {
        setCount((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      if (completedRef.current) return;
      completedRef.current = true;
      triggerHaptic('success');
      soundService.playTone(880, 'triangle', 0.3, 0.3);
      onCompleteRef.current();
    }
  }, [count]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070709] flex flex-col items-center justify-center p-6 text-center select-none animate-fadeIn">
      {/* Glow de Fundo */}
      <div className="absolute w-96 h-96 bg-gradient-to-tr from-[#ff6d2e]/30 to-[#ffb800]/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-1 shadow-glow flex items-center justify-center">
          <div className="w-full h-full bg-[#070709] rounded-[22px] flex items-center justify-center">
            <Flame className="w-8 h-8 text-[#ff6d2e] animate-bounce" />
          </div>
        </div>

        <h2 className="text-sm font-extrabold uppercase tracking-widest text-slate-400">
          PREPARE-SE PARA CORRER
        </h2>

        {/* Animação do Contador */}
        <div key={count} className="text-8xl sm:text-9xl font-black text-gradient font-mono animate-ping-once drop-shadow-glow">
          {count > 0 ? count : 'GO!'}
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Mantenha a postura e boa passada!
        </p>
      </div>
    </div>
  );
}
