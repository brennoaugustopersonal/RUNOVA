import React from 'react';
import { Flame, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full px-5 py-4 backdrop-blur-xl bg-[#070709]/80 border-b border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Logo Icon with Orange-Yellow Glow */}
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-[2px] shadow-glow flex items-center justify-center">
          <div className="w-full h-full bg-[#09090d] rounded-[14px] flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#ff6d2e] fill-[#ff6d2e]/20 animate-pulse" />
          </div>
        </div>
        
        {/* Title */}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-extrabold tracking-wider text-gradient leading-none">
              RUNOVA
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-[#ff6d2e]/10 text-[#ff6d2e] border border-[#ff6d2e]/20">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide mt-0.5">
            Personal Running Tracker
          </p>
        </div>
      </div>

      {/* Right side badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-slate-300 font-medium">
        <Zap className="w-3.5 h-3.5 text-[#ffb800] fill-[#ffb800]" />
        <span>Pronto</span>
      </div>
    </header>
  );
}
