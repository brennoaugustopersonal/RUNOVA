import { useCallback, useRef, useState } from 'react';
import {
  X,
  User,
  Ruler,
  HeartPulse,
  Volume2,
  Gauge,
  Download,
  Upload,
  Trash2,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import { estimateMaxHeartRate } from '../utils/calculations';
import { getStorageUsageKb } from '../services/storageService';
import { downloadJson } from '../utils/download';
import type { RunRecord, UserSettings } from '../types/domain';

interface SettingsModalProps {
  isOpen: boolean;
  settings: UserSettings;
  runs: RunRecord[];
  onClose: () => void;
  onUpdate: (patch: Partial<UserSettings>) => void;
  onImport: (runs: RunRecord[]) => void;
  onClearHistory: () => void;
}

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  hint?: string;
  icon: React.ReactNode;
  onChange: (value: number) => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  hint,
  icon,
  onChange,
}: NumberFieldProps) {
  const id = `settings-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <span className="text-[#ff6d2e]">{icon}</span>
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) onChange(next);
            }}
            onBlur={(e) => {
              const next = Number(e.target.value);
              onChange(Math.min(max, Math.max(min, Number.isFinite(next) ? next : min)));
            }}
            className="w-20 text-right bg-transparent text-xl font-extrabold text-white font-mono focus:outline-none focus:text-[#ffb800]"
          />
          <span className="text-xs font-bold text-slate-400">{suffix}</span>
        </div>
      </div>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#ff6d2e]"
      />
      {hint && <p className="text-[10px] text-slate-500 leading-relaxed">{hint}</p>}
    </div>
  );
}

export function SettingsModal({
  isOpen,
  settings,
  runs,
  onClose,
  onUpdate,
  onImport,
  onClearHistory,
}: SettingsModalProps) {
  const containerRef = useModalA11y(isOpen, onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleImportFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const parsed: unknown = JSON.parse(await file.text());
        if (!Array.isArray(parsed)) {
          setImportMessage('Arquivo inválido: esperado um array de corridas.');
          return;
        }
        onImport(parsed as RunRecord[]);
        setImportMessage(`${parsed.length} corrida(s) importada(s) com sucesso.`);
      } catch {
        setImportMessage('Não foi possível ler o arquivo. Verifique se é um JSON exportado daqui.');
      }
    },
    [onImport]
  );

  if (!isOpen) return null;

  const estimatedMaxHr = estimateMaxHeartRate(settings.ageYears);
  const storageKb = getStorageUsageKb();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Fechar configurações"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        className="relative w-full max-w-md bg-[#0d0d14] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl space-y-4 overflow-y-auto max-h-[92vh] animate-modal-enter"
      >
        <div className="flex items-center justify-between sticky -top-6 -mt-6 pt-6 pb-2 bg-[#0d0d14] z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#ff6d2e]/20 to-[#ffb800]/20 text-[#ff6d2e]">
              <User className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="settings-title" className="text-lg font-extrabold text-white">
                Perfil e Preferências
              </h2>
              <p className="text-xs text-slate-400">Deixa as estimativas mais precisas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <NumberField
          label="Peso"
          value={settings.weightKg}
          min={30}
          max={250}
          suffix="kg"
          icon={<Gauge className="w-4 h-4" />}
          hint="Base do cálculo de calorias (equação MET do Compendium of Physical Activities)."
          onChange={(weightKg) => onUpdate({ weightKg })}
        />

        <NumberField
          label="Altura"
          value={settings.heightCm}
          min={100}
          max={230}
          suffix="cm"
          icon={<Ruler className="w-4 h-4" />}
          onChange={(heightCm) => onUpdate({ heightCm })}
        />

        <NumberField
          label="Idade"
          value={settings.ageYears}
          min={10}
          max={100}
          suffix="anos"
          icon={<User className="w-4 h-4" />}
          hint={`FC máxima estimada: ${estimatedMaxHr} bpm (fórmula de Tanaka).`}
          onChange={(ageYears) => onUpdate({ ageYears })}
        />

        <NumberField
          label="FC de repouso"
          value={settings.restingHrBpm}
          min={30}
          max={110}
          suffix="bpm"
          icon={<HeartPulse className="w-4 h-4" />}
          hint="Meça pela manhã, ainda deitado. Usada no método de Karvonen."
          onChange={(restingHrBpm) => onUpdate({ restingHrBpm })}
        />

        <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="settings-maxhr"
              className="flex items-center gap-2 text-sm font-semibold text-slate-300"
            >
              <span className="text-[#ff6d2e]">
                <HeartPulse className="w-4 h-4" />
              </span>
              FC máxima medida
            </label>
            <div className="flex items-baseline gap-1">
              <input
                id="settings-maxhr"
                type="number"
                inputMode="numeric"
                min={100}
                max={230}
                placeholder={String(estimatedMaxHr)}
                value={settings.maxHrBpm ?? ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  onUpdate({ maxHrBpm: raw === '' ? null : Number(raw) });
                }}
                className="w-20 text-right bg-transparent text-xl font-extrabold text-white font-mono focus:outline-none focus:text-[#ffb800] placeholder:text-slate-600"
              />
              <span className="text-xs font-bold text-slate-400">bpm</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            Opcional. Se você já fez um teste de esforço, informe o valor real — as zonas de
            treino ficam mais fiéis. Vazio usa a estimativa por idade.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Unidades</p>
          <div
            className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900/80"
            role="radiogroup"
            aria-label="Sistema de unidades"
          >
            {(['metric', 'imperial'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                role="radio"
                aria-checked={settings.units === unit}
                onClick={() => onUpdate({ units: unit })}
                className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                  settings.units === unit
                    ? 'bg-gradient-to-r from-[#ff6d2e] to-[#ffb800] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {unit === 'metric' ? 'Métrico (km)' : 'Imperial (mi)'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-300">
              <Volume2 className="w-4 h-4 text-[#ffb800]" aria-hidden="true" />
              Coach de voz
            </span>
            <input
              type="checkbox"
              checked={!settings.voiceMuted}
              onChange={(e) => onUpdate({ voiceMuted: !e.target.checked })}
              className="w-5 h-5 accent-[#ff6d2e] cursor-pointer"
            />
          </label>
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="text-sm font-semibold text-slate-300">
              Anúncio a cada quilômetro
            </span>
            <input
              type="checkbox"
              checked={settings.audioCuesKm}
              onChange={(e) => onUpdate({ audioCuesKm: e.target.checked })}
              className="w-5 h-5 accent-[#ff6d2e] cursor-pointer"
            />
          </label>
        </div>

        <div className="p-3.5 rounded-2xl glass-panel border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Database className="w-3.5 h-3.5" aria-hidden="true" />
              Seus dados
            </p>
            <span className="text-[10px] text-slate-500 font-mono">
              {runs.length} corridas · ~{storageKb} KB
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                downloadJson(runs, `runova-backup-${new Date().toISOString().slice(0, 10)}.json`)
              }
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Exportar
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-[#ffb800] hover:border-[#ffb800]/30 transition-colors"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              Importar
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void handleImportFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />

          {importMessage && <p className="text-[11px] text-slate-400">{importMessage}</p>}

          <button
            type="button"
            onClick={onClearHistory}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Apagar todo o histórico
          </button>
        </div>

        <p className="flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-500" aria-hidden="true" />
          Tudo fica apenas neste dispositivo. O app não tem servidor, conta nem rastreamento —
          somente as APIs públicas de clima e mapas são consultadas.
        </p>
      </div>
    </div>
  );
}
