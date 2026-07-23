import { describe, it, expect } from 'vitest';
import { formatTime, formatPace, formatDistance, formatSpeed, formatDate } from '../utils/formatters';

describe('formatTime', () => {
  it('retorna 00:00 para valores inválidos', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(null)).toBe('00:00');
    expect(formatTime(undefined)).toBe('00:00');
    expect(formatTime(-5)).toBe('00:00');
    expect(formatTime(NaN)).toBe('00:00');
  });

  it('formata corretamente segundos menores que 1 hora', () => {
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(720)).toBe('12:00');
    expect(formatTime(599)).toBe('09:59');
    expect(formatTime(3599)).toBe('59:59');
  });

  it('formata corretamente valores maiores que 1 hora', () => {
    expect(formatTime(3600)).toBe('01:00:00');
    expect(formatTime(3661)).toBe('01:01:01');
    expect(formatTime(7200)).toBe('02:00:00');
  });
});

describe('formatPace', () => {
  it('retorna --\'--" para valores inválidos', () => {
    expect(formatPace(0)).toBe("--'--\"");
    expect(formatPace(null)).toBe("--'--\"");
    expect(formatPace(undefined)).toBe("--'--\"");
    expect(formatPace(-1)).toBe("--'--\"");
    expect(formatPace(Infinity)).toBe("--'--\"");
  });

  it('formata ritmo corretamente', () => {
    expect(formatPace(5.0)).toBe("5'00\"");
    expect(formatPace(5.5)).toBe("5'30\"");
    expect(formatPace(6.25)).toBe("6'15\"");
  });
});

describe('formatDistance', () => {
  it('retorna 0,00 para valores inválidos', () => {
    expect(formatDistance(null)).toBe('0,00');
    expect(formatDistance(undefined)).toBe('0,00');
    expect(formatDistance(NaN)).toBe('0,00');
  });

  it('formata distância com casas decimais corretas', () => {
    expect(formatDistance(2.1, 1)).toBe('2,1');
    expect(formatDistance(5.0, 2)).toBe('5,00');
    expect(formatDistance(10.567, 2)).toBe('10,57');
  });
});

describe('formatSpeed', () => {
  it('retorna 0,0 para valores inválidos', () => {
    expect(formatSpeed(0)).toBe('0,0');
    expect(formatSpeed(null)).toBe('0,0');
    expect(formatSpeed(-1)).toBe('0,0');
  });

  it('formata velocidade corretamente', () => {
    expect(formatSpeed(10.5)).toBe('10,5');
    expect(formatSpeed(8.0)).toBe('8,0');
  });
});

describe('formatDate', () => {
  it('retorna string vazia para datas inválidas', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('formata "Hoje" para datas de hoje', () => {
    const now = new Date().toISOString();
    const result = formatDate(now);
    expect(result).toContain('Hoje');
  });

  it('formata "Ontem" para datas de ontem', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const result = formatDate(yesterday);
    expect(result).toContain('Ontem');
  });
});
