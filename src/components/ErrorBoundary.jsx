import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070709] flex items-center justify-center p-6">
          <div className="max-w-sm w-full glass-panel rounded-3xl p-8 text-center space-y-4 border border-white/10">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-lg font-extrabold text-white">Ops! Algo deu errado</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 font-extrabold text-sm hover:opacity-90 transition-all active:scale-95 shadow-glow"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
