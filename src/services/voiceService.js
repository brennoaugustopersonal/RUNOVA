/**
 * Serviço de Treinador por Voz usando Web SpeechSynthesis API nativa.
 * Anuncia marcos e métricas em Português com controle de Mute.
 */

class VoiceService {
  constructor() {
    this.muted = false;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voice = null;
    this.initVoice();
  }

  initVoice() {
    if (!this.synth) return;
    const findVoice = () => {
      const voices = this.synth.getVoices();
      // Procura por voz em português (pt-BR ou pt-PT)
      this.voice = voices.find((v) => v.lang.includes('pt')) || voices[0] || null;
    };
    findVoice();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.synth) {
      this.synth.cancel();
    }
    return this.muted;
  }

  speak(text) {
    if (this.muted || !this.synth || !text) return;
    try {
      this.synth.cancel(); // Cancela falas anteriores
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) utterance.voice = this.voice;
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05; // Velocidade levemente acelerada para esporte
      utterance.pitch = 1.0;
      this.synth.speak(utterance);
    } catch (e) {
      // Ignora falhas de síntese de voz
    }
  }

  speakStart() {
    this.speak('Corrida iniciada! Mantenha o foco e bom treino!');
  }

  speakPause() {
    this.speak('Corrida pausada.');
  }

  speakResume() {
    this.speak('Corrida retomada!');
  }

  speakKmSplit(kmNumber, paceMinKm) {
    const mins = Math.floor(paceMinKm);
    const secs = Math.round((paceMinKm - mins) * 60);
    this.speak(`Você completou ${kmNumber} quilômetro. Ritmo médio: ${mins} minutos e ${secs} segundos por quilômetro.`);
  }

  speakFinish(totalDistanceKm) {
    this.speak(`Parabéns! Você concluiu sua corrida de ${totalDistanceKm.toFixed(1)} quilômetros! Excelente trabalho!`);
  }
}

export const voiceService = new VoiceService();
