import { memo, useMemo } from 'react';
import { Heart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatDuration } from '../utils/formatters';
import type { HeartRateSample } from '../types/domain';

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 50;
const MAX_RENDERED_POINTS = 240;

interface HeartRateChartProps {
  heartRateHistory?: HeartRateSample[];
  durationSeconds?: number;
}

function HeartRateChartFn({ heartRateHistory = [], durationSeconds = 0 }: HeartRateChartProps) {
  const chart = useMemo(() => {
    if (heartRateHistory.length === 0) return null;

    // Reamostra antes de desenhar: acima de ~240 pontos o SVG fica pesado
    // no celular sem ganho visual algum.
    const step = Math.max(1, Math.ceil(heartRateHistory.length / MAX_RENDERED_POINTS));
    const samples = heartRateHistory.filter(
      (_, i) => i % step === 0 || i === heartRateHistory.length - 1
    );

    const bpmValues = heartRateHistory.map((h) => h.bpm);
    const min = Math.min(...bpmValues);
    const max = Math.max(...bpmValues);
    const avg = Math.round(bpmValues.reduce((a, b) => a + b, 0) / bpmValues.length);
    const latest = bpmValues[bpmValues.length - 1];
    const trend = latest > avg + 2 ? 'up' : latest < avg - 2 ? 'down' : 'stable';

    const range = Math.max(max - min, 10); // evita divisão por zero em FC constante
    const denominator = Math.max(1, samples.length - 1);

    const coords = samples.map((entry, i) => ({
      x: (i / denominator) * VIEW_WIDTH,
      y: VIEW_HEIGHT - ((entry.bpm - min) / range) * VIEW_HEIGHT,
      bpm: entry.bpm,
    }));

    const markerEvery = Math.max(1, Math.floor(coords.length / 8));

    return {
      min,
      max,
      avg,
      latest,
      trend,
      points: coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
      markers: coords.filter((_, i) => i % markerEvery === 0 || i === coords.length - 1),
    };
  }, [heartRateHistory]);

  if (!chart) {
    return (
      <div className="p-5 rounded-3xl glass-panel border border-white/10 space-y-3 shadow-card">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
          <Heart className="w-5 h-5 text-rose-400" aria-hidden="true" />
          Frequência cardíaca
        </h3>
        <p className="text-xs text-slate-400 text-center py-6">
          Nenhum dado de frequência cardíaca para esta corrida.
        </p>
      </div>
    );
  }

  const TrendIcon = chart.trend === 'up' ? TrendingUp : chart.trend === 'down' ? TrendingDown : Minus;

  return (
    <section className="p-5 rounded-3xl glass-panel border border-white/10 space-y-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-white">
          <Heart className="w-5 h-5 text-rose-400" aria-hidden="true" />
          Frequência cardíaca
        </h3>
        <span
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${
            chart.trend === 'up'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : chart.trend === 'down'
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}
        >
          <TrendIcon className="w-3 h-3" aria-hidden="true" />
          {chart.latest} bpm
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-xl bg-sky-500/5 border border-sky-500/10">
          <dt className="text-[10px] font-bold text-sky-400 uppercase">Mín</dt>
          <dd className="text-lg font-black text-white font-mono">{chart.min}</dd>
        </div>
        <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
          <dt className="text-[10px] font-bold text-emerald-400 uppercase">Média</dt>
          <dd className="text-lg font-black text-white font-mono">{chart.avg}</dd>
        </div>
        <div className="p-2 rounded-xl bg-rose-500/5 border border-rose-500/10">
          <dt className="text-[10px] font-bold text-rose-400 uppercase">Máx</dt>
          <dd className="text-lg font-black text-white font-mono">{chart.max}</dd>
        </div>
      </dl>

      <div className="relative pt-2">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT + 5}`}
          className="w-full h-32"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Variação da frequência cardíaca: mínima ${chart.min}, média ${chart.avg}, máxima ${chart.max} batimentos por minuto`}
        >
          <defs>
            <linearGradient id="hrAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff6d2e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ff6d2e" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 25, 50].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2={VIEW_WIDTH}
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="0.3"
            />
          ))}

          <polygon points={`0,${VIEW_HEIGHT} ${chart.points} ${VIEW_WIDTH},${VIEW_HEIGHT}`} fill="url(#hrAreaGrad)" />
          <polyline
            points={chart.points}
            fill="none"
            stroke="#ff6d2e"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {chart.markers.map((m, i) => (
            <circle key={i} cx={m.x.toFixed(1)} cy={m.y.toFixed(1)} r="1.2" fill="#ff6d2e" opacity="0.7" />
          ))}
        </svg>

        <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
          <span>{chart.min} bpm</span>
          <span>{formatDuration(durationSeconds)}</span>
          <span>{chart.max} bpm</span>
        </div>
      </div>
    </section>
  );
}

export const HeartRateChart = memo(HeartRateChartFn);
export default HeartRateChart;
