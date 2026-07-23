import { describe, it, expect } from 'vitest';
import { formatTime, formatPace, formatDistance, formatSpeed, formatDate } from '../utils/formatters';

describe('formatTime', () => {
  it('retorna 00:00 para valores inválidos', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(null)).toBe('00:00');
    expect(formatTime(undefined)).toBe('00:00');
    expect(formatTime(-5)).toBe('00:00');
    expect(formatTime(NaN)).toBe('00:00');
    expect(formatTime('invalido')).toBe('00:00');
    expect(formatTime(Infinity)).toBe('00:00');
    expect(formatTime(-Infinity)).toBe('00:00');
  });

  it('formata corretamente segundos menores que 1 hora', () => {
    expect(formatTime(65)).toBe('01:05');
    expect(formatTime(720)).toBe('12:00');
    expect(formatTime(599)).toBe('09:59');
    expect(formatTime(3599)).toBe('59:59');
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(1)).toBe('00:01');
    expect(formatTime(59)).toBe('00:59');
  });

  it('formata corretamente valores maiores que 1 hora', () => {
    expect(formatTime(3600)).toBe('01:00:00');
    expect(formatTime(3661)).toBe('01:01:01');
    expect(formatTime(7200)).toBe('02:00:00');
    expect(formatTime(86399)).toBe('23:59:59');
  });

  it('formata corretamente valores muito grandes (múltiplos dias)', () => {
    expect(formatTime(86400)).toBe('24:00:00');
    expect(formatTime(172800)).toBe('48:00:00');
    expect(formatTime(90061)).toBe('25:01:01');
  });

  it('formata segundos fracionários truncando', () => {
    expect(formatTime(65.7)).toBe('01:05');
    expect(formatTime(90.1)).toBe('01:30');
    expect(formatTime(3600.99)).toBe('01:00:00');
  });

  it('arredonda segundos para baixo', () => {
    expect(formatTime(61.999)).toBe('01:01');
  });

  it('lida com valores extremamente grandes', () => {
    const result = formatTime(999999);
    expect(result).toMatch(/^\d+:\d{2}:\d{2}$/);
    const [hours, minutes, seconds] = result.split(':').map(Number);
    expect(hours).toBeGreaterThan(0);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThan(60);
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(seconds).toBeLessThan(60);
  });
});

describe('formatPace', () => {
  it('retorna placeholder para valores invalidos', () => {
    expect(formatPace(0)).toBe("--'--\"");
    expect(formatPace(null)).toBe("--'--\"");
    expect(formatPace(undefined)).toBe("--'--\"");
    expect(formatPace(-1)).toBe("--'--\"");
    expect(formatPace(Infinity)).toBe("--'--\"");
    expect(formatPace(-Infinity)).toBe("--'--\"");
    expect(formatPace(NaN)).toBe("--'--\"");
    expect(formatPace('invalido')).toBe("--'--\"");
  });

  it('formata ritmo corretamente para valores inteiros', () => {
    expect(formatPace(5.0)).toBe("5'00\"");
    expect(formatPace(6.0)).toBe("6'00\"");
    expect(formatPace(3.0)).toBe("3'00\"");
  });

  it('formata ritmo corretamente para valores fracionários', () => {
    expect(formatPace(5.5)).toBe("5'30\"");
    expect(formatPace(6.25)).toBe("6'15\"");
    expect(formatPace(5.75)).toBe("5'45\"");
    expect(formatPace(4.2)).toBe("4'12\"");
  });

  it('formata pace muito rápido (sub-3 min/km)', () => {
    expect(formatPace(2.5)).toBe("2'30\"");
    expect(formatPace(2.83)).toBe("2'50\"");
  });

  it('formata pace muito lento', () => {
    expect(formatPace(12.0)).toBe("12'00\"");
    expect(formatPace(10.5)).toBe("10'30\"");
  });

  it('lida com arredondamento de segundos', () => {
    expect(formatPace(5.99)).toBe("5'59\"");
    expect(formatPace(6.0)).toBe("6'00\"");
  });
});

describe('formatDistance', () => {
  it('retorna 0,00 para valores inválidos', () => {
    expect(formatDistance(null)).toBe('0,00');
    expect(formatDistance(undefined)).toBe('0,00');
    expect(formatDistance(NaN)).toBe('0,00');
    expect(formatDistance('texto')).toBe('0,00');
  });

  it('formata distância com casas decimais corretas (padrão 2)', () => {
    expect(formatDistance(5.0)).toBe('5,00');
    expect(formatDistance(10.567)).toBe('10,57');
    expect(formatDistance(0)).toBe('0,00');
  });

  it('formata com 1 casa decimal quando especificado', () => {
    expect(formatDistance(2.1, 1)).toBe('2,1');
    expect(formatDistance(5.0, 1)).toBe('5,0');
    expect(formatDistance(3.45, 1)).toBe('3,5');
  });

  it('formata com 0 casas decimais', () => {
    expect(formatDistance(42.195, 0)).toBe('42');
  });

  it('formata distâncias muito pequenas', () => {
    expect(formatDistance(0.1, 2)).toBe('0,10');
    expect(formatDistance(0.01, 2)).toBe('0,01');
  });

  it('formata distâncias muito grandes', () => {
    expect(formatDistance(1000, 2)).toBe('1.000,00');
    expect(formatDistance(9999.99, 2)).toBe('9.999,99');
  });

  it('arredonda corretamente', () => {
    expect(formatDistance(5.555, 2)).toBe('5,56');
    expect(formatDistance(5.554, 2)).toBe('5,55');
  });
});

describe('formatSpeed', () => {
  it('retorna 0,0 para valores inválidos', () => {
    expect(formatSpeed(0)).toBe('0,0');
    expect(formatSpeed(null)).toBe('0,0');
    expect(formatSpeed(undefined)).toBe('0,0');
    expect(formatSpeed(NaN)).toBe('0,0');
    expect(formatSpeed(-1)).toBe('0,0');
    expect(formatSpeed('invalido')).toBe('0,0');
    expect(formatSpeed(-Infinity)).toBe('0,0');
  });

  it('formata velocidade corretamente', () => {
    expect(formatSpeed(10.5)).toBe('10,5');
    expect(formatSpeed(8.0)).toBe('8,0');
    expect(formatSpeed(12.34)).toBe('12,3');
  });

  it('formata velocidades muito altas', () => {
    expect(formatSpeed(42.0)).toBe('42,0');
    expect(formatSpeed(100.99)).toBe('101,0');
  });

  it('arredonda para 1 casa decimal', () => {
    expect(formatSpeed(5.55)).toBe('5,6');
    expect(formatSpeed(5.54)).toBe('5,5');
  });
});

describe('formatDate', () => {
  it('retorna string vazia para datas inválidas', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('data-invalida')).toBe('');
  });

  it('formata "Hoje" para datas de hoje', () => {
    const now = new Date().toISOString();
    const result = formatDate(now);
    expect(result).toContain('Hoje');
    expect(result).toMatch(/Hoje às \d{2}:\d{2}/);
  });

  it('formata "Ontem" para datas de ontem', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const result = formatDate(yesterday);
    expect(result).toContain('Ontem');
    expect(result).toMatch(/Ontem às \d{2}:\d{2}/);
  });

  it('formata datas específicas em português', () => {
    const date = new Date(2024, 0, 15, 10, 30).toISOString();
    const result = formatDate(date);
    expect(result).toContain('15 de Jan');
    expect(result).toContain('10:30');
  });

  it('formata mês de fevereiro', () => {
    const date = new Date(2024, 1, 20, 8, 15).toISOString();
    const result = formatDate(date);
    expect(result).toContain('Fev');
  });

  it('formata ano anterior corretamente', () => {
    const date = new Date(2023, 11, 25, 14, 0).toISOString();
    const result = formatDate(date);
    expect(result).toMatch(/25 de Dez/);
  });

  it('não confunde hoje com ontem em virada de dia', () => {
    const now = new Date();
    const earlierToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1).toISOString();
    const result = formatDate(earlierToday);
    expect(result).toContain('Hoje');
  });

  it('formata timestamp ISO completo', () => {
    const date = '2024-03-15T14:30:00.000Z';
    const result = formatDate(date);
    expect(result).toMatch(/\d{1,2} de \w+ às \d{2}:\d{2}/);
  });
});
