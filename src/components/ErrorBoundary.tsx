import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message ?? null };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  /** Escape hatch: um snapshot corrompido não pode deixar o app travado. */
  private handleResetSession = () => {
    try {
      localStorage.removeItem('runova_active_run_v1');
    } catch {
      // armazenamento indisponível
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center p-6">
        <div className="max-w-sm w-full glass-panel rounded-3xl p-8 text-center space-y-4 border border-white/10">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-extrabold text-white">Algo deu errado</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Ocorreu um erro inesperado. Seu histórico de corridas continua salvo neste dispositivo.
          </p>
          {this.state.message && (
            <p className="text-[10px] font-mono text-slate-600 break-words">{this.state.message}</p>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950 font-extrabold text-sm hover:opacity-90 transition-all active:scale-95 shadow-glow"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Recarregar
            </button>
            <button
              type="button"
              onClick={this.handleResetSession}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold text-xs hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Descartar corrida em andamento e recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
