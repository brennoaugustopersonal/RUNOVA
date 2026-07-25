import { useState, useEffect, useCallback } from 'react';
import { Flame, Zap, Wind, Droplets, Leaf, Settings, ChevronDown } from 'lucide-react';
import {
  fetchCurrentWeather,
  fetchAirQuality,
  fetchWeatherByIP,
  getRunningConditionsScore,
  getRunningAdvice,
} from '../services/weatherService';
import type { AirQuality, WeatherSnapshot } from '../types/domain';

const SAO_PAULO: [number, number] = [-23.55, -46.63];

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [aqi, setAqi] = useState<AirQuality | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async (lat: number, lon: number) => {
      const [w, a] = await Promise.all([fetchCurrentWeather(lat, lon), fetchAirQuality(lat, lon)]);
      if (cancelled) return;
      if (w) setWeather(w);
      if (a) setAqi(a);
      setLoading(false);
    };

    const fallbackIp = async () => {
      const byIp = await fetchWeatherByIP();
      if (cancelled) return;
      if (byIp?.weather) {
        setWeather(byIp.weather);
        setCity(byIp.city);
        const a = await fetchAirQuality(byIp.lat, byIp.lon);
        if (!cancelled && a) setAqi(a);
        setLoading(false);
        return;
      }
      await load(...SAO_PAULO);
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => void load(pos.coords.latitude, pos.coords.longitude),
        () => void fallbackIp(),
        { timeout: 8000, maximumAge: 300000 }
      );
    } else {
      void fallbackIp();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleDetails = useCallback(() => setShowDetails((v) => !v), []);

  const score = getRunningConditionsScore(weather, aqi);
  const advice = getRunningAdvice(weather, aqi);

  return (
    <header className="sticky top-0 z-30 w-full px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 backdrop-blur-xl bg-[#070709]/85 border-b border-white/5">
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-tr from-[#ff6d2e] to-[#ffb800] p-[2px] shadow-glow flex items-center justify-center">
            <span className="w-full h-full bg-[#09090d] rounded-[14px] flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#ff6d2e] fill-[#ff6d2e]/20" aria-hidden="true" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-extrabold tracking-wider text-gradient leading-none">
                RUNOVA
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-[#ff6d2e]/10 text-[#ff6d2e] border border-[#ff6d2e]/20">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-0.5 truncate">
              {city ?? 'Personal Running Tracker'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {weather ? (
            <button
              type="button"
              onClick={toggleDetails}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full glass-panel text-xs text-slate-200 font-semibold border border-white/10 hover:border-[#ff6d2e]/30 transition-colors active:scale-95"
              aria-expanded={showDetails}
              aria-label={`Clima: ${weather.temperature} graus, ${weather.description}. Ver detalhes`}
            >
              <span className="text-base leading-none" aria-hidden="true">
                {weather.emoji}
              </span>
              <span>{weather.temperature}°</span>
              {aqi && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: aqi.color }}
                  aria-hidden="true"
                />
              )}
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          ) : loading ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-slate-400 font-medium">
              <span className="w-3 h-3 rounded-full border-2 border-slate-500 border-t-[#ffb800] animate-spin" />
              <span>Clima…</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-slate-300 font-medium">
              <Zap className="w-3.5 h-3.5 text-[#ffb800] fill-[#ffb800]" aria-hidden="true" />
              <span>Pronto</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-full glass-panel border border-white/10 text-slate-300 hover:text-white hover:border-[#ff6d2e]/30 transition-colors active:scale-95"
            aria-label="Abrir perfil e configurações"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showDetails && weather && (
        <div className="max-w-md mx-auto mt-3 p-3 rounded-2xl glass-panel border border-white/10 animate-fadeIn space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-white">
              {weather.emoji} {weather.description}
            </p>
            {score && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                  score.score >= 70
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : score.score >= 50
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                }`}
              >
                Corrida: {score.label} · {score.score}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Wind className="w-3 h-3 text-sky-400" aria-hidden="true" />
              <span>{weather.windSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Droplets className="w-3 h-3 text-blue-400" aria-hidden="true" />
              <span>{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-amber-400 font-bold">UV</span>
              <span>{weather.uvIndex}</span>
            </div>
          </div>

          {aqi && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-300 pt-1 border-t border-white/5">
              <Leaf className="w-3 h-3" style={{ color: aqi.color }} aria-hidden="true" />
              <span>
                Ar: <strong style={{ color: aqi.color }}>{aqi.label}</strong> (AQI {aqi.aqi})
              </span>
              <span className="text-slate-500">• PM2.5 {aqi.pm25} µg/m³</span>
            </div>
          )}

          {advice && (
            <p className="text-[11px] text-[#ffb800] font-medium leading-relaxed">{advice}</p>
          )}

          <p className="text-[10px] text-slate-500">
            Sensação térmica {weather.feelsLike}°C · dados Open-Meteo (gratuito, sem chave)
          </p>
        </div>
      )}
    </header>
  );
}
