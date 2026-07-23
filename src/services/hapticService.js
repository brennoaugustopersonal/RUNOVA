/**
 * Serviço de Feedback Háptico (Vibração no Celular) via HTML5 Vibration API
 */

export function triggerHaptic(type = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(30);
        break;
      case 'medium':
        navigator.vibrate(60);
        break;
      case 'heavy':
        navigator.vibrate([100, 50, 100]);
        break;
      case 'countdown':
        navigator.vibrate(70);
        break;
      case 'success':
        navigator.vibrate([100, 50, 100, 50, 150]);
        break;
      default:
        navigator.vibrate(40);
    }
  } catch (e) {
    // Ignora se não for suportado no dispositivo
  }
}
