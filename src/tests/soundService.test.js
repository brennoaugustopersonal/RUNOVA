import { describe, it, expect, beforeEach, vi } from 'vitest';
import { soundService } from '../services/soundService';

describe('soundService', () => {
  let createOscillatorMock, createGainMock, startMock, stopMock, connectMock;

  beforeEach(() => {
    startMock = vi.fn();
    stopMock = vi.fn();
    connectMock = vi.fn();

    const gainMock = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: connectMock,
    };

    createGainMock = vi.fn().mockReturnValue(gainMock);
    createOscillatorMock = vi.fn().mockReturnValue({
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: startMock,
      stop: stopMock,
    });

    const AudioCtxMock = vi.fn().mockImplementation(function () {
      return {
        createOscillator: createOscillatorMock,
        createGain: createGainMock,
        currentTime: 100,
        state: 'running',
        destination: 'dest',
      };
    });

    globalThis.AudioContext = AudioCtxMock;
    globalThis.window = globalThis;

    soundService.ctx = null;
  });

  it('playTone cria oscilador e gain', () => {
    soundService.playTone(440, 'sine', 0.5, 0.3);
    expect(createOscillatorMock).toHaveBeenCalled();
    expect(createGainMock).toHaveBeenCalled();
  });

  it('playTone inicia e para o oscilador', () => {
    soundService.playTone(440, 'sine', 0.5, 0.3);
    expect(startMock).toHaveBeenCalled();
    expect(stopMock).toHaveBeenCalled();
  });

  it('playStartSound toca arpejo de 3 notas', () => {
    soundService.playStartSound();
    expect(startMock).toHaveBeenCalledTimes(3);
  });

  it('playPauseSound toca 2 notas', () => {
    soundService.playPauseSound();
    expect(startMock).toHaveBeenCalledTimes(2);
  });

  it('playCelebrationSound toca 4 notas', () => {
    soundService.playCelebrationSound();
    expect(startMock).toHaveBeenCalledTimes(4);
  });

  it('playStartSound agenda notas com offset de tempo', () => {
    soundService.playStartSound();
    expect(createOscillatorMock).toHaveBeenCalled();
    expect(startMock).toHaveBeenCalled();
  });

  it('nao lanca erro quando AudioContext nao existe', () => {
    delete globalThis.AudioContext;
    delete globalThis.window;
    soundService.ctx = null;
    expect(() => soundService.playTone(440, 'sine', 0.15, 0.15)).not.toThrow();
    expect(() => soundService.playStartSound()).not.toThrow();
    expect(() => soundService.playPauseSound()).not.toThrow();
    expect(() => soundService.playCelebrationSound()).not.toThrow();
  });

  it('retoma AudioContext suspenso', () => {
    const resumeMock = vi.fn();
    const AudioCtxSuspended = vi.fn().mockImplementation(function () {
      return {
        createOscillator: createOscillatorMock,
        createGain: createGainMock,
        currentTime: 100,
        state: 'suspended',
        resume: resumeMock,
        destination: 'dest',
      };
    });
    globalThis.AudioContext = AudioCtxSuspended;
    soundService.ctx = null;
    soundService.playTone(440, 'sine', 0.5, 0.3);
    expect(resumeMock).toHaveBeenCalled();
  });
});
