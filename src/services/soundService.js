/**
 * Serviço de Áudio Sintético Otimizado com Web Audio API Nativa.
 * Agenda osciladores diretamente na linha do tempo do hardware audio clock,
 * com 0ms de bloqueio no thread principal de renderização.
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

  // Agenda um tom na linha do tempo com tempo exato
  scheduleTone(freq, type = 'sine', startTime, duration = 0.15, gainVal = 0.15) {
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch (e) {
      // Ignora silenciosamente se o áudio estiver bloqueado pelo navegador
    }
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
    this.init();
    if (!this.ctx) return;
    this.scheduleTone(freq, type, this.ctx.currentTime, duration, gainVal);
  }

  // Som de Início (Arpejo Triplo Laranja) - 0ms de atraso
  playStartSound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.scheduleTone(523.25, 'triangle', now, 0.1, 0.15); // C5
    this.scheduleTone(659.25, 'triangle', now + 0.12, 0.1, 0.15); // E5
    this.scheduleTone(783.99, 'triangle', now + 0.24, 0.25, 0.2); // G5
  }

  // Som de Pausa
  playPauseSound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.scheduleTone(659.25, 'sine', now, 0.12, 0.1);
    this.scheduleTone(440.0, 'sine', now + 0.13, 0.2, 0.1);
  }

  // Som de Conclusão / Comemoração
  playCelebrationSound() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this.scheduleTone(freq, 'square', now + idx * 0.1, 0.2, 0.12);
    });
  }
}

export const soundService = new SoundService();
