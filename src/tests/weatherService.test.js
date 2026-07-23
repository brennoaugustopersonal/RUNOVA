import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchCurrentWeather, resetWeatherCache } from '../services/weatherService';

describe('fetchCurrentWeather', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    resetWeatherCache();
  });

  it('retorna null para coordenadas invalidas', async () => {
    expect(await fetchCurrentWeather(null, null)).toBeNull();
    expect(await fetchCurrentWeather(undefined, undefined)).toBeNull();
    expect(await fetchCurrentWeather(NaN, NaN)).toBeNull();
    expect(await fetchCurrentWeather(0, null)).toBeNull();
  });

  it('retorna dados de clima para resposta bem-sucedida', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        current_weather: { temperature: 22.5, weathercode: 0, windspeed: 10 },
      }),
    });

    const result = await fetchCurrentWeather(-23.55, -46.63);
    expect(result.temperature).toBe(23);
    expect(result.description).toBe('Céu Limpo');
    expect(result.emoji).toBe('☀️');
    expect(result.windSpeed).toBe(10);
  });

  it('retorna null para resposta HTTP com erro', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false, status: 500 });
    expect(await fetchCurrentWeather(-23.55, -46.63)).toBeNull();
  });

  it('retorna null se current_weather nao existir', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: null }),
    });
    expect(await fetchCurrentWeather(-23.55, -46.63)).toBeNull();
  });

  it('retorna null se corpo da resposta for vazio', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await fetchCurrentWeather(-23.55, -46.63)).toBeNull();
  });

  it('retorna null se fetch lanca excecao (rede)', async () => {
    globalThis.fetch.mockRejectedValue(new Error('Network error'));
    expect(await fetchCurrentWeather(-23.55, -46.63)).toBeNull();
  });

  it('retorna null se JSON for malformado', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => { throw new Error('Parse error'); },
    });
    expect(await fetchCurrentWeather(-23.55, -46.63)).toBeNull();
  });

  it('usa a URL correta da API Open-Meteo', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: { temperature: 20, weathercode: 1, windspeed: 5 } }),
    });

    await fetchCurrentWeather(-23.55, -46.63);

    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toContain('api.open-meteo.com');
    expect(url).toContain('latitude=-23.55');
    expect(url).toContain('longitude=-46.63');
    expect(url).toContain('current_weather=true');
  });

  it('retorna descricao correta para codigo WMO 0 (Ceu Limpo)', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: { temperature: 30, weathercode: 0, windspeed: 0 } }),
    });
    expect((await fetchCurrentWeather(0, 0)).description).toBe('Céu Limpo');
    expect((await fetchCurrentWeather(0, 0)).emoji).toBe('☀️');
  });

  it('retorna descricao para codigo WMO 95 (Trovoada)', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: { temperature: 20, weathercode: 95, windspeed: 15 } }),
    });
    const result = await fetchCurrentWeather(0, 0);
    expect(result.description).toBe('Trovoada');
    expect(result.emoji).toBe('⛈️');
  });

  it('retorna fallback para codigo WMO desconhecido', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: { temperature: 25, weathercode: 999, windspeed: 0 } }),
    });
    const result = await fetchCurrentWeather(0, 0);
    expect(result.description).toBe('Indisponível');
    expect(result.emoji).toBe('🌡️');
  });

  it('usa weathercode 0 como fallback se codigo nao existir', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: { temperature: 28, windspeed: 8 } }),
    });
    const result = await fetchCurrentWeather(0, 0);
    expect(result.description).toBe('Céu Limpo');
  });

  it('arredonda temperatura para inteiro', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: { temperature: 22.7, weathercode: 0, windspeed: 0 } }),
    });
    expect((await fetchCurrentWeather(0, 0)).temperature).toBe(23);
  });

  it('arredonda temperatura negativa corretamente', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: { temperature: -1.3, weathercode: 0, windspeed: 0 } }),
    });
    expect((await fetchCurrentWeather(0, 0)).temperature).toBe(-1);
  });

  it('retorna windSpeed corretamente', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true, json: async () => ({ current_weather: { temperature: 15, weathercode: 45, windspeed: 25 } }),
    });
    expect((await fetchCurrentWeather(0, 0)).windSpeed).toBe(25);
  });
});
