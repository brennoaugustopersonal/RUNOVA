import { AlertTriangle } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Substitui window.confirm — em PWA no celular o diálogo nativo é
 * inconsistente, bloqueia a thread e quebra a identidade visual.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const containerRef = useModalA11y(isOpen, onCancel);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
      />
      <div
        ref={containerRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-3xl bg-[#0d0d14] border border-white/10 p-6 space-y-4 shadow-2xl animate-modal-enter"
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-2xl border shrink-0 ${
              tone === 'danger'
                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                : 'bg-[#ff6d2e]/15 border-[#ff6d2e]/30 text-[#ff6d2e]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 id="confirm-dialog-title" className="text-base font-extrabold text-white">
              {title}
            </h2>
            <p id="confirm-dialog-message" className="text-sm text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold text-slate-300 hover:bg-white/10 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-2xl text-sm font-extrabold transition-all active:scale-[0.98] ${
              tone === 'danger'
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
