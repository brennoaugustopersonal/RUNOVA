import React, { Suspense } from 'react';

const RouteMapInner = React.lazy(() => import('./RouteMapInner'));

function LoadingPlaceholder({ height }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 glass-panel shadow-card">
      <div
        style={{ height }}
        className="relative w-full z-0 bg-[#0a0a0f] flex items-center justify-center"
      >
        <span className="text-sm text-slate-400">Carregando mapa...</span>
      </div>
    </div>
  );
}

export const RouteMap = React.memo(function RouteMap(props) {
  return (
    <Suspense fallback={<LoadingPlaceholder height={props.height || '200px'} />}>
      <RouteMapInner {...props} />
    </Suspense>
  );
});

export default RouteMap;
