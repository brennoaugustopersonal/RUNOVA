import React, { useMemo } from 'react';
import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function HeartRateChartFn({ heartRateHistory = [], durationSeconds = 0 }) {
  const stats = useMemo(() => {
    if (!heartRateHistory || heartRateHistory.length === 0) return null;

    const bpmValues = heartRateHistory.map((h) => h.bpm);
    const min = Math.min(...bpmValues);
    const max = Math.max(...bpmValues);
    const avg = Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length);
    const latest = bpmValues[bpmValues.length - 1];
    const trend = latest > avg ? 'up' : latest < avg ? 'down' : 'stable';

    return { min, max, avg, latest, trend, count: bpmValues.length };
  }, [heartRateHistory]);

  const pathData = useMemo(() => {
    if (!heartRateHistory || heartRateHistory.length < 2) return null;

    const width = 100;
    const height = 50;

    const bpmValues = heartRateHistory.map((h) => h.bpm);
    const minVal = Math.min(...bpmValues);
    const maxVal = Math.max(...bpmValues);
    const range = Math.max(maxVal - minVal, 10); // Evitar divisão por zero

    const points = heartRateHistory.map((entry, i) => {
      const x = (i / (heartRateHistory.length - 1)) * width;
      const y = height - ((entry.bpm - minVal) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return { points, minVal, maxVal, range };
  }, [heartRateHistory]);

  if (!heartRateHistory || heartRateHistory.length === 0) {
    return (
      <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-3 shadow-card">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-extrabold text-white">Variação da Frequência Cardíaca</h3>
        </div>
        <p className="text-xs text-slate-400 text-center py-6">
          Nenhum dado de frequência cardíaca disponível para esta corrida.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-3 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-extrabold text-white">Frequência Cardíaca</h3>
        </div>

        {/* Trend Badge */}
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            stats.trend === 'up'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : stats.trend === 'down'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}
        >
          {stats.trend === 'up' ? (
            <TrendingUp className="w-3 h-3" />
          ) : stats.trend === 'down' ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          <span>{stats.latest} BPM</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-xl bg-rose-500/5 border border-rose-500/10">
          <p className="text-[10px] font-bold text-rose-400 uppercase">Mín</p>
          <p className="text-lg font-black text-white font-mono">{stats.min}</p>
        </div>
        <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <p className="text-[10px] font-bold text-emerald-400 uppercase">Méd</p>
          <p className="text-lg font-black text-white font-mono">{stats.avg}</p>
        </div>
        <div className="p-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
          <p className="text-[10px] font-bold text-amber-400 uppercase">Máx</p>
          <p className="text-lg font-black text-white font-mono">{stats.max}</p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative pt-2">
        {pathData ? (
          <svg
            viewBox="0 0 100 55"
            className="w-full h-32 overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Grid lines */}
            <line x1="0" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
            <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" />

            {/* Área sob a curva (gradiente) */}
            <defs>
              <linearGradient id="hrAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6d2e" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ff6d2e" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,50 ${pathData.points.join(' ')} 100,50`}
              fill="url(#hrAreaGrad)"
            />

            {/* Linha da FC */}
            <polyline
              points={pathData.points.join(' ')}
              fill="none"
              stroke="#ff6d2e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-glow"
            />

            {/* Pontos destacados */}
            {heartRateHistory.filter((_, i) => 
              i === 0 || i === heartRateHistory.length - 1 || 
              i % Math.max(1, Math.floor(heartRateHistory.length / 8)) === 0
            ).map((entry, i) => {
              const idx = heartRateHistory.indexOf(entry);
              const x = (idx / (heartRateHistory.length - 1)) * 100;
              const y = 50 - ((entry.bpm - pathData.minVal) / pathData.range) * 50;
              return (
                <circle
                  key={idx}
                  cx={x.toFixed(1)}
                  cy={y.toFixed(1)}
                  r="1.2"
                  fill="#ff6d2e"
                  className="opacity-70"
                />
              );
            })}
          </svg>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400">
            Dados insuficientes para gerar gráfico
          </div>
        )}

        {/* Labels de eixo */}
        <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
          <span>{stats.min} BPM</span>
          <span>Tempo ({(heartRateHistory.length * 5).toFixed(0)}s amostrados)</span>
          <span>{stats.max} BPM</span>
        </div>
      </div>
    </div>
  );
}

export const HeartRateChart = React.memo(HeartRateChartFn);
export default HeartRateChart;
