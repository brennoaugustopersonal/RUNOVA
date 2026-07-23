/**
 * Serviço de Áudio Sintético utilizando Web Audio API nativa
 * Não requer arquivos externos de áudio e funciona em dispositivos móveis.
 */

class SoundService {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Toca um tom único
  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Ignora silenciosamente se o navegador bloquear autoplay
    }
  }

  // Som de Início de Corrida (Beep triplo ascendente)
  playStartSound() {
    this.playTone(523.25, 'triangle', 0.1, 0.15); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.15), 120); // E5
    setTimeout(() => this.playTone(783.99, 'triangle', 0.25, 0.2), 240); // G5
  }

  // Som de Pausa (Tom duplo descendente)
  playPauseSound() {
    this.playTone(659.25, 'sine', 0.12, 0.1);
    setTimeout(() => this.playTone(440, 'sine', 0.2, 0.1), 130);
  }

  // Som de Conclusão / Vitória (Arpejo festivo)
  playCelebrationSound() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.2, 0.12);
      }, idx * 100);
    });
  }
}

export const soundService = new SoundService();
