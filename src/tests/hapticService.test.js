import { describe, it, expect, beforeEach, vi } from 'vitest';
import { triggerHaptic } from '../services/hapticService';

describe('triggerHaptic', () => {
  beforeEach(() => {
    globalThis.navigator.vibrate = vi.fn();
  });

  it('chama navigator.vibrate com duracao para type light', () => {
    triggerHaptic('light');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith(30);
  });

  it('chama navigator.vibrate com duracao para type medium', () => {
    triggerHaptic('medium');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith(60);
  });

  it('chama navigator.vibrate com padrao para type heavy', () => {
    triggerHaptic('heavy');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
  });

  it('chama navigator.vibrate com duracao para type countdown', () => {
    triggerHaptic('countdown');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith(70);
  });

  it('chama navigator.vibrate com padrao para type success', () => {
    triggerHaptic('success');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith([100, 50, 100, 50, 150]);
  });

  it('usa fallback para tipo desconhecido', () => {
    triggerHaptic('unknown');
    expect(globalThis.navigator.vibrate).toHaveBeenCalledWith(40);
  });

  it('nao lanca erro se navigator.vibrate nao existir', () => {
    delete globalThis.navigator.vibrate;
    expect(() => triggerHaptic('light')).not.toThrow();
  });

  it('nao lanca erro se navigator nao existir', () => {
    const origNav = globalThis.navigator;
    delete globalThis.navigator;
    expect(() => triggerHaptic('light')).not.toThrow();
    globalThis.navigator = origNav;
  });
});
