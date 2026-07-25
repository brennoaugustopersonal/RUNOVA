import { lazy, memo, Suspense } from 'react';
import type { GeoPosition, RoutePoint } from '../types/domain';

// Leaflet + CSS pesam ~150 KB: carregados só quando um mapa aparece na tela.
const RouteMapInner = lazy(() => import('./RouteMapInner'));

export interface RouteMapProps {
  routePoints?: RoutePoint[];
  currentPos?: GeoPosition | null;
  height?: string;
  live?: boolean;
}

function LoadingPlaceholder({ height }: { height: string }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 glass-panel shadow-card">
      <div
        style={{ height }}
        className="relative w-full z-0 bg-[#0a0a0f] flex items-center justify-center skeleton-shimmer"
      >
        <span className="text-sm text-slate-400">Carregando mapa…</span>
      </div>
    </div>
  );
}

export const RouteMap = memo(function RouteMap(props: RouteMapProps) {
  return (
    <Suspense fallback={<LoadingPlaceholder height={props.height ?? '200px'} />}>
      <RouteMapInner {...props} />
    </Suspense>
  );
});

export default RouteMap;
