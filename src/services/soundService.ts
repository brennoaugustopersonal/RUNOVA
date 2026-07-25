/**
 * Áudio sintético via Web Audio API.
 * Os osciladores são agendados diretamente no relógio de hardware,
 * sem bloquear a thread principal de renderização.
 */

type OscType = OscillatorType;

class SoundService {
  ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  muted = false;

  init(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1;
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
  }

  /** Agenda um tom em um instante exato da linha do tempo do áudio. */
  scheduleTone(
    freq: number,
    type: OscType = 'sine',
    startTime: number,
    duration = 0.15,
    gainVal = 0.15
  ): void {
    try {
      this.init();
      if (!this.ctx || this.muted) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.masterGain ?? this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
      // Libera os nós assim que o tom termina, evitando acúmulo em corridas longas.
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } catch {
      // Áudio bloqueado pelo navegador até a primeira interação — ignorado
    }
  }

  playTone(freq: number, type: OscType = 'sine', duration = 0.15, gainVal = 0.15): void {
    this.init();
    if (!this.ctx) return;
    this.scheduleTone(freq, type, this.ctx.currentTime, duration, gainVal);
  }

  /** Arpejo triplo ascendente — início de corrida. */
  playStartSound(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.scheduleTone(523.25, 'triangle', now, 0.1, 0.15); // C5
    this.scheduleTone(659.25, 'triangle', now + 0.12, 0.1, 0.15); // E5
    this.scheduleTone(783.99, 'triangle', now + 0.24, 0.25, 0.2); // G5
  }

  playPauseSound(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.scheduleTone(659.25, 'sine', now, 0.12, 0.1);
    this.scheduleTone(440.0, 'sine', now + 0.13, 0.2, 0.1);
  }

  /** Bipe curto de marcação de quilômetro. */
  playSplitSound(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.scheduleTone(880, 'sine', now, 0.08, 0.12);
    this.scheduleTone(1174.66, 'sine', now + 0.1, 0.12, 0.12);
  }

  playCelebrationSound(): void {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      this.scheduleTone(freq, 'square', now + idx * 0.1, 0.2, 0.12);
    });
  }
}

export const soundService = new SoundService();
