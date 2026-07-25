/**
 * Treinador por voz usando a Web Speech Synthesis API nativa.
 * Anuncia marcos e métricas em português, com controle de mute persistido.
 */

const MUTE_KEY = 'runova_voice_muted';

class VoiceService {
  muted: boolean;
  synth: SpeechSynthesis | null;
  voice: SpeechSynthesisVoice | null;

  constructor() {
    this.muted = false;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voice = null;
    try {
      if (typeof localStorage !== 'undefined') {
        this.muted = localStorage.getItem(MUTE_KEY) === '1';
      }
    } catch {
      // armazenamento indisponível — mantém o padrão
    }
    this.initVoice();
  }

  initVoice(): void {
    if (!this.synth) return;
    const findVoice = () => {
      if (!this.synth) return;
      const voices = this.synth.getVoices();
      if (!Array.isArray(voices) || voices.length === 0) return;
      this.voice =
        voices.find((v) => v.lang?.toLowerCase().startsWith('pt-br')) ||
        voices.find((v) => v.lang?.toLowerCase().includes('pt')) ||
        voices[0] ||
        null;
    };
    findVoice();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  setMuted(muted: boolean): boolean {
    this.muted = muted;
    if (this.muted && this.synth) this.synth.cancel();
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // ignorado
    }
    return this.muted;
  }

  toggleMute(): boolean {
    return this.setMuted(!this.muted);
  }

  speak(text: string): void {
    if (this.muted || !this.synth || !text) return;
    try {
      this.synth.cancel(); // evita fila acumulada durante a corrida
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) utterance.voice = this.voice;
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05; // levemente acelerado para uso esportivo
      utterance.pitch = 1.0;
      this.synth.speak(utterance);
    } catch {
      // síntese de voz indisponível — falha silenciosa
    }
  }

  speakStart(): void {
    this.speak('Corrida iniciada! Mantenha o foco e bom treino!');
  }

  speakPause(): void {
    this.speak('Corrida pausada.');
  }

  speakResume(): void {
    this.speak('Corrida retomada!');
  }

  speakKmSplit(kmNumber: number, paceMinKm: number): void {
    const mins = Math.floor(paceMinKm);
    const secs = Math.round((paceMinKm - mins) * 60);
    const unit = kmNumber === 1 ? 'quilômetro' : 'quilômetros';
    const minLabel = mins === 1 ? 'minuto' : 'minutos';
    const secLabel = secs === 1 ? 'segundo' : 'segundos';
    this.speak(
      `Você completou ${kmNumber} ${unit}. Ritmo médio: ${mins} ${minLabel} e ${secs} ${secLabel} por quilômetro.`
    );
  }

  /** Aviso quando o ritmo desvia muito do alvo — coach ativo. */
  speakPaceAlert(currentPaceMinKm: number, targetPaceMinKm: number): void {
    if (!currentPaceMinKm || !targetPaceMinKm) return;
    const deltaSeconds = Math.round((currentPaceMinKm - targetPaceMinKm) * 60);
    if (Math.abs(deltaSeconds) < 20) return;
    const mins = Math.floor(currentPaceMinKm);
    const secs = Math.round((currentPaceMinKm - mins) * 60);
    const direction = deltaSeconds > 0 ? 'abaixo do' : 'acima do';
    this.speak(
      `Atenção: ritmo ${direction} alvo. Você está em ${mins} minutos e ${secs} segundos por quilômetro.`
    );
  }

  speakFinish(totalDistanceKm: number): void {
    const distance = Number.isFinite(totalDistanceKm) ? totalDistanceKm : 0;
    this.speak(
      `Parabéns! Você concluiu sua corrida de ${distance.toFixed(1)} quilômetros! Excelente trabalho!`
    );
  }
}

export const voiceService = new VoiceService();
