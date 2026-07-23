import React, { useState, useEffect } from 'react';
import { Flame, Zap, Cloud } from 'lucide-react';
import { fetchCurrentWeather } from '../services/weatherService';

export function Header() {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async (lat, lon) => {
      const data = await fetchCurrentWeather(lat, lon);
      if (data && !cancelled) setWeather(data);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(-23.55, -46.63),
        { timeout: 8000 }
      );
    } else {
      fetchWeather(-23.55, -46.63);
    }

    return () => { cancelled = true; };
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full px-5 py-4 backdrop-blur-xl bg-[#070709]/80 border-b border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Logo Icon */}
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-[2px] shadow-glow flex items-center justify-center">
          <div className="w-full h-full bg-[#09090d] rounded-[14px] flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#ff6d2e] fill-[#ff6d2e]/20" />
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

      {/* Right: Weather badge or Ready badge */}
      {weather ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-slate-200 font-semibold border border-white/10">
          <span className="text-base">{weather.emoji}</span>
          <span>{weather.temperature}°C</span>
          <span className="hidden sm:inline text-slate-400">• {weather.description}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-slate-300 font-medium">
          <Zap className="w-3.5 h-3.5 text-[#ffb800] fill-[#ffb800]" />
          <span>Pronto</span>
        </div>
      )}
    </header>
  );
}
