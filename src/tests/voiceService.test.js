import { describe, it, expect, beforeEach, vi } from 'vitest';
import { voiceService } from '../services/voiceService';

describe('voiceService', () => {
  let speakMock, cancelMock, getVoicesMock;

  beforeEach(() => {
    speakMock = vi.fn();
    cancelMock = vi.fn();
    getVoicesMock = vi.fn().mockReturnValue([
      { lang: 'pt-BR', name: 'Google portugues do Brasil' },
    ]);

    globalThis.SpeechSynthesisUtterance = vi.fn().mockImplementation(function (text) {
      this.text = text;
      this.lang = '';
      this.rate = 1;
      this.pitch = 1;
      this.voice = null;
    });

    globalThis.speechSynthesis = {
      speak: speakMock,
      cancel: cancelMock,
      getVoices: getVoicesMock,
      onvoiceschanged: null,
    };

    globalThis.window = globalThis;

    voiceService.muted = false;
    voiceService.synth = globalThis.speechSynthesis;
    voiceService.voice = null;
    voiceService.initVoice();
  });

  it('inicia com mute desativado', () => {
    expect(voiceService.muted).toBe(false);
  });

  it('toggleMute alterna estado de mute', () => {
    expect(voiceService.toggleMute()).toBe(true);
    expect(voiceService.muted).toBe(true);
    expect(voiceService.toggleMute()).toBe(false);
    expect(voiceService.muted).toBe(false);
  });

  it('toggleMute cancela falas pendentes ao mutar', () => {
    voiceService.toggleMute();
    expect(cancelMock).toHaveBeenCalled();
  });

  it('speakStart anuncia inicio da corrida', () => {
    voiceService.speakStart();
    expect(speakMock).toHaveBeenCalled();
    const utterance = speakMock.mock.calls[0][0];
    expect(utterance.text).toContain('Corrida iniciada');
    expect(utterance.lang).toBe('pt-BR');
  });

  it('speakPause anuncia pausa', () => {
    voiceService.speakPause();
    expect(speakMock).toHaveBeenCalled();
    expect(speakMock.mock.calls[0][0].text).toContain('pausada');
  });

  it('speakResume anuncia retomada', () => {
    voiceService.speakResume();
    expect(speakMock).toHaveBeenCalled();
    expect(speakMock.mock.calls[0][0].text).toContain('retomada');
  });

  it('speakKmSplit anuncia km e ritmo', () => {
    voiceService.speakKmSplit(5, 5.5);
    expect(speakMock).toHaveBeenCalled();
    const text = speakMock.mock.calls[0][0].text;
    expect(text).toContain('5');
    expect(text).toContain('quilômetro');
    expect(text).toContain('5 minutos');
    expect(text).toContain('30 segundos');
  });

  it('speakKmSplit calcula corretamente minutos e segundos do pace', () => {
    voiceService.speakKmSplit(3, 6.25);
    const text = speakMock.mock.calls[0][0].text;
    expect(text).toContain('6 minutos');
    expect(text).toContain('15 segundos');
  });

  it('speakFinish anuncia conclusao com distancia', () => {
    voiceService.speakFinish(5.0);
    expect(speakMock).toHaveBeenCalled();
    const text = speakMock.mock.calls[0][0].text;
    expect(text).toContain('5.0');
    expect(text).toContain('quilômetros');
    expect(text).toContain('Parabéns');
  });

  it('nao fala quando muted', () => {
    voiceService.toggleMute();
    voiceService.speakStart();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it('cancela falas anteriores antes de falar', () => {
    voiceService.speakStart();
    expect(cancelMock).toHaveBeenCalled();
  });

  it('define taxa de fala para 1.05', () => {
    voiceService.speakStart();
    const utterance = speakMock.mock.calls[0][0];
    expect(utterance.rate).toBe(1.05);
  });

  it('usa voz em portugues quando disponivel', () => {
    voiceService.speakStart();
    const utterance = speakMock.mock.calls[0][0];
    expect(utterance.voice).toBeDefined();
    expect(utterance.voice.lang).toContain('pt');
  });
});
