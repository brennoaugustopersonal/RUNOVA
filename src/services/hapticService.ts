/**
 * Feedback háptico (vibração) via HTML5 Vibration API.
 * Silencioso e sem efeito em dispositivos sem suporte.
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'countdown' | 'success' | 'warning';

const PATTERNS: Record<HapticType, number | number[]> = {
  light: 30,
  medium: 60,
  heavy: [100, 50, 100],
  countdown: 70,
  success: [100, 50, 100, 50, 150],
  warning: [40, 40, 40],
};

export function triggerHaptic(type: HapticType | string = 'light'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

  try {
    navigator.vibrate(PATTERNS[type as HapticType] ?? 40);
  } catch {
    // Ignorado — não suportado ou bloqueado pelo dispositivo
  }
}
